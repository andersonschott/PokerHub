# PokerHub Domain and Application Layer Audit Report

## CRITICAL ISSUES - HIGH PRIORITY

### 1. DOMAIN LAYER - MISSING VALIDATIONS

#### 1.1 League Entity (src/PokerHub.Domain/Entities/League.cs)
- **Issue**: No validation for InviteCode generation
  - `GenerateInviteCode()` uses `Random` (not thread-safe)
  - Could generate duplicate codes (8 chars from base64 = ~48 bits entropy, risk of collisions with high volume)
  - No check in `RegenerateInviteCode()` to ensure new code is unique
- **Lines**: 27-35
- **Impact**: Race conditions, potential invite code conflicts

#### 1.2 Tournament Entity (src/PokerHub.Domain/Entities/Tournament.cs)
- **Issue**: Insufficient validation for tournament state transitions
  - `IsRebuyAllowed()` doesn't validate if RebuyLimitType is valid
  - Missing validation for negative or zero values (BuyIn, RebuyValue, AddonValue)
  - `PrizeStructure` is string but no validation of format (expects comma-separated decimals)
  - `GenerateInviteCode()` uses same unsafe `Random` as League
- **Lines**: 66-77, 97-102
- **Impact**: Invalid rebuy logic, malformed prize structures cause calculation errors

#### 1.3 Player Entity (src/PokerHub.Domain/Entities/Player.cs)
- **Issue**: No email validation
  - `Email` field has no format validation
  - `PixKey` field has no validation for PIX key format (should validate based on PixKeyType)
- **Lines**: 11, 13
- **Impact**: Invalid contact data stored in DB

#### 1.4 TournamentPlayer Entity (src/PokerHub.Domain/Entities/TournamentPlayer.cs)
- **Issue**: Missing business rule validation
  - `TotalInvestment()` method has no null check on Tournament parameter
  - No validation that RebuyCount >= 0
  - Can set negative Position (no validation)
- **Lines**: 28-39
- **Impact**: Potential null reference, invalid data states

#### 1.5 TournamentExpense Entity (src/PokerHub.Domain/Entities/TournamentExpense.cs)
- **Issue**: No validation
  - TotalAmount can be negative or zero
  - No validation of SplitType enum
  - Description can be empty or null (should have minimum length)
- **Lines**: 5-19
- **Impact**: Malformed expense records

#### 1.6 BlindLevel Entity (src/PokerHub.Domain/Entities/BlindLevel.cs)
- **Issue**: No validation
  - SmallBlind, BigBlind, Ante can be negative
  - DurationMinutes can be zero or negative
  - Order can be duplicated across tournament
  - IsBreak=true with non-zero SmallBlind/BigBlind is invalid state
- **Lines**: 3-17
- **Impact**: Invalid tournament structure, timer calculation errors

#### 1.7 PaymentStatus and PaymentType Enums
- **Issue**: No validation in Payment entity
  - Payment entity doesn't enforce valid status transitions
    - Should prevent Pending->Confirmed without Paid first (except for admin)
    - Should prevent reverting status
  - Missing transitions handling (e.g., what if payment is already Confirmed?)
- **Impact**: Invalid payment state sequences allowed

### 2. SERVICE QUALITY ISSUES - CODE STRUCTURE

#### 2.1 TournamentService (src/PokerHub.Application/Services/TournamentService.cs)
- **Issue**: Large method with multiple responsibilities
  - `FinishTournamentAsync()` (lines 322-387): Handles position assignment, prize calculation, rounding adjustment, and jackpot recording. Should be split.
  - `FinishTournamentWithCustomPrizesAsync()` (lines 389-423): Duplicates logic with `FinishTournamentAsync()`
  - **Recommendation**: Extract prize finalization logic to separate method
  
- **Issue**: Missing error handling
  - `FinishTournamentAsync()` line 336: If `_prizeTableService.CalculatePrizeDistributionAsync()` fails, exception bubbles up unhandled
  - `FinishTournamentAsync()` line 383: If `_jackpotService.RecordContributionAsync()` fails during transaction, payments already saved
  - **Recommendation**: Add try-catch or use transactions
  
- **Issue**: Potential N+1 queries
  - `GetTournamentDetailAsync()` (line 55-140): Multiple ThenInclude calls on Players - could load all tournament players twice
  - `CanUserManageTournamentAsync()` (line 736-756): Loads full Players collection with Player data when only checking membership
  
- **Issue**: Duplicate code
  - Blind template methods (lines 678-734): Code is nearly identical, could be refactored to single method with template parameter
  
- **Issue**: Missing validation
  - `CreateTournamentAsync()` (line 142): No validation that BlindLevels total time is reasonable
  - `StartTournamentAsync()` (line 258): No check if there are checked-in players
  - `UpdateTimeRemainingAsync()` (line 668): No validation that secondsRemaining >= 0

#### 2.2 PaymentService (src/PokerHub.Application/Services/PaymentService.cs)
- **Issue**: Large complex algorithm without clear separation
  - `CalculateAndCreatePaymentsAsync()` (lines 93-314): ~220 lines in single method
  - Multiple phases but no clear abstraction or separate helper methods
  - Difficult to test payment calculation phases independently
  - **Recommendation**: Extract phases to private methods (Phase1_PerfectMatches, Phase2_SingleCreditor, etc.)
  
- **Issue**: Potential bug with rounding
  - Line 150-169: Rounding difference adjustment logic is complex and hard to follow
  - If multiple debtors exist, only largest debtor gets adjusted (line 157-158)
  - No validation that rounding adjustment doesn't exceed reasonable bounds
  - **Recommendation**: Add explicit rounding adjustment logging/validation
  
- **Issue**: Index-based creditor tracking error-prone
  - Lines 147-148: Uses creditorList index for tracking instead of PlayerId
  - Makes code harder to debug and understand
  - **Recommendation**: Create creditor object with index instead of separate list

#### 2.3 LeagueService (src/PokerHub.Application/Services/LeagueService.cs)
- **Issue**: Duplicate debt checking logic
  - `JoinLeagueAsync()`: No debt checking before joining (but other methods check)
  - **Recommendation**: Consistent debt validation policy
  
- **Issue**: Missing transaction handling
  - `UpdateLeagueAsync()` (line 184-217): Updates league then counts players/tournaments separately
  - Race condition: counts could be stale if players/tournaments change between update and count queries
  - **Recommendation**: Use COUNT in single query or transaction
  
- **Issue**: Inefficient query
  - `UpdateLeagueAsync()` line 199-200: Two separate COUNT queries when could use single query
  - **Recommendation**: Use aggregate query instead

#### 2.4 PlayerService (src/PokerHub.Application/Services/PlayerService.cs)
- **Issue**: Duplicate debt checking logic
  - `DeletePlayerAsync()` lines 174-186: Checks debts as both debtor and creditor
  - Same logic repeated in LeagueService.LeaveLeagueAsync() lines 387-399
  - **Recommendation**: Extract to PaymentService method like `HasAnyUnconfirmedPaymentsAsync()`
  
- **Issue**: Inefficient mapping
  - `MapToDto()` (lines 277-307): Called after querying with Participations included
  - Line 279-281: Filters finished participations again (should be in query)
  - Line 283-284: Sums TotalInvestment in LINQ-to-Objects (could be in SQL)
  - **Recommendation**: Calculate in query or use GroupBy

#### 2.5 TournamentExpenseService (src/PokerHub.Application/Services/TournamentExpenseService.cs)
- **Issue**: Validation spread across methods
  - Lines 47-72: Tournament, payer, share validation duplicated in CreateExpenseAsync
  - Lines 145-166: Same validation repeated in UpdateExpenseAsync
  - **Recommendation**: Extract to private validation method
  
- **Issue**: Rounding handling inconsistency
  - Line 88: `Math.Round(..., 2)` for equal split
  - Line 285: `Math.Round(..., MidpointRounding.AwayFromZero)` for expense payments
  - Different rounding modes could cause accounting discrepancies
  - **Recommendation**: Use consistent rounding strategy

#### 2.6 RankingService (src/PokerHub.Application/Services/RankingService.cs)
- **Issue**: Complex merge logic without clear abstraction
  - `GetLeagueRankingAsync()` (lines 18-134): Merges legacy stats with tournament stats
  - Over 115 lines in single method
  - Difficult to understand and maintain merge algorithm
  - **Recommendation**: Extract merge logic to separate method

### 3. INTERFACE-IMPLEMENTATION GAPS

#### 3.1 ITournamentService vs TournamentService
- **Gap**: Interface doesn't document which methods throw exceptions
  - `CreateTournamentAsync()` could throw InvalidOperationException but interface doesn't specify
  - `UpdateTournamentAsync()` returns bool instead of throwing - inconsistent pattern
  - **Recommendation**: Standardize on exception-based or result-based error handling

#### 3.2 IPaymentService missing methods
- **Gap**: No method to delete/cancel a payment (both parties need this ability)
  - Can only mark as paid/confirmed, but no way to cancel pending payment
  - **Recommendation**: Add `CancelPaymentAsync(Guid paymentId, Guid playerId)`
  
- **Gap**: No bulk payment confirmation for organizer
  - Admin must confirm payments one-by-one
  - **Recommendation**: Add `BulkConfirmPaymentsAsync(Guid[] paymentIds, string organizerId)`

#### 3.3 ITournamentService missing validation method
- **Gap**: No method to validate tournament before starting
  - `StartTournamentAsync()` doesn't validate prerequisites (blind levels, players)
  - **Recommendation**: Add `ValidateTournamentBeforeStartAsync(Guid tournamentId)`

#### 3.4 IPlayerService missing payment validation
- **Gap**: `GetPendingDebtsAsync()` filters out jackpot payments by checking ToPlayerId
  - But this is fragile logic repeated in PaymentService (line 45-46)
  - **Recommendation**: Add PaymentService method `GetPlayerToPlayerDebtsAsync()` with clear semantics

### 4. DTO ISSUES

#### 4.1 PaymentDto (src/PokerHub.Application/DTOs/Payment/PaymentDto.cs)
- **Issue**: Ambiguous fields for jackpot payments
  - `IsJackpotContribution` is derived property, but also checks `ToPlayerId == null` (line 457 in PaymentService)
  - When Type=Jackpot but ToPlayerId is set, behavior is undefined
  - `ToPlayerPixKey` and `ToPlayerPixKeyType` are null for jackpot (hardcoded in MapToDto)
  - **Recommendation**: Use separate DTO for jackpot vs regular payments, or add explicit validation

#### 4.2 PendingDebtDto (src/PokerHub.Application/DTOs/Payment/PendingDebtDto.cs)
- **Issue**: Missing CreditorPixKeyType in some contexts
  - Has `CreditorPixKey` but not `CreditorPixKeyType` needed to format payment
  - **Recommendation**: Add `CreditorPixKeyType` field

#### 4.3 TournamentDto (src/PokerHub.Application/DTOs/Tournament/TournamentDto.cs)
- **Issue**: PrizeDistributionType missing from DTO
  - `PrizeDistributionType` is on Tournament entity but not in TournamentDto
  - Frontend needs this to understand how to interpret PrizeStructure
  - **Recommendation**: Add `PrizeDistributionType` to TournamentDto

#### 4.4 Tournament-related DTOs missing validation info
- **Issue**: No DTO for validation errors
  - Services return bool or throw exceptions
  - Should have `(bool Success, List<string> Errors)` pattern or dedicated ValidationResultDto
  - **Recommendation**: Create common `OperationResultDto<T>` with Errors list

### 5. MISSING ERROR HANDLING PATTERNS

#### 5.1 Cascading operation failures
- **Issue**: Payment calculation depends on jackpot service
  - Line 383 in TournamentService: If jackpot recording fails after payment creation, data is inconsistent
  - **Recommendation**: Use database transactions or saga pattern for multi-service operations

#### 5.2 Concurrency issues
- **Issue**: `Random` usage in invite code generation is not thread-safe
  - Shared static Random can cause contention and duplicate codes
  - **Recommendation**: Use `System.Security.Cryptography.RandomNumberGenerator` or inject from DI

#### 5.3 Missing validation before complex operations
- **Issue**: `SelfRegisterPlayerAsync()` doesn't validate:
  - Tournament actually exists (line 893-900 checks but returns message instead of logging)
  - User has permissions to register (league membership is checked but should fail earlier)
  - Player not already checked-in (line 914 checks but after league load)
  - **Recommendation**: Add explicit validation methods with fail-fast approach

### 6. MISSING BUSINESS RULES

#### 6.1 Payment workflow
- Missing rule: Payment reversal
  - Can't undo a Confirmed payment
  - Can't change payment amount
  - **Recommendation**: Add reversal capability with audit trail
  
#### 6.2 Tournament lifecycle
- Missing rule: Can't start tournament without players
  - `StartTournamentAsync()` doesn't verify minimum player count
  - **Recommendation**: Add validation in `StartTournamentAsync()`
  
#### 6.3 Player-league relationship
- Missing rule: Can't join league with same user multiple times
  - `JoinLeagueAsync()` creates new player if email doesn't match (line 347-367)
  - But user could join same league as multiple unlinked players
  - **Recommendation**: Add validation that user has only one active player per league

#### 6.4 Expense sharing
- Missing rule: Payer can't be in expense shares
  - If payer is in shares, creates circular payment (pays themself via share)
  - TournamentExpenseService doesn't prevent this
  - **Recommendation**: Add validation: `payer not in shares.PlayerIds`

---

## SUMMARY

**Total Issues Found: 35+**

- **Critical Validations Missing**: 7 entities lack proper validation (League, Tournament, Player, TournamentPlayer, TournamentExpense, BlindLevel, Payment)
- **Large Methods**: 3 methods >100 lines (FinishTournament, CalculateAndCreatePayments, GetLeagueRanking)
- **Duplicated Code**: 4 instances of code duplication (debt checking, validation, rounding logic, blind templates)
- **N+1 Query Risks**: 3 queries with potential N+1 issues
- **Interface Gaps**: 4 missing interface methods
- **Thread Safety Issues**: 2 instances of unsafe Random usage
- **Transaction/Concurrency Issues**: 3 scenarios with race conditions
- **Error Handling**: 5 areas with missing or inconsistent error handling
