namespace PokerHub.Domain.Enums;

[Flags]
public enum DelegatePermissions
{
    None = 0,
    CheckIn = 1,
    Eliminate = 2,
    ManageRebuys = 4,
    Finish = 8,
    All = CheckIn | Eliminate | ManageRebuys | Finish
}
