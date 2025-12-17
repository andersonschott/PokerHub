using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentInviteCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InviteCode",
                table: "Tournaments",
                type: "nvarchar(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "");

            // Generate unique invite codes for existing tournaments
            migrationBuilder.Sql(@"
                DECLARE @chars VARCHAR(36) = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

                UPDATE Tournaments
                SET InviteCode = (
                    SELECT TOP 1 code FROM (
                        SELECT
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) +
                            SUBSTRING(@chars, ABS(CHECKSUM(NEWID())) % 36 + 1, 1) AS code
                    ) AS NewCode
                    WHERE NOT EXISTS (SELECT 1 FROM Tournaments t2 WHERE t2.InviteCode = NewCode.code AND t2.Id != Tournaments.Id)
                )
                WHERE InviteCode = '' OR InviteCode IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_InviteCode",
                table: "Tournaments",
                column: "InviteCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tournaments_InviteCode",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "InviteCode",
                table: "Tournaments");
        }
    }
}
