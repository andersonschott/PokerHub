using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerMembershipStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_LeagueId",
                table: "Players");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeactivatedAt",
                table: "Players",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DeactivatedManually",
                table: "Players",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityAt",
                table: "Players",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MembershipStatus",
                table: "Players",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "InactivityThresholdMonths",
                table: "Leagues",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Players_LeagueId_MembershipStatus",
                table: "Players",
                columns: new[] { "LeagueId", "MembershipStatus" });

            // Backfill: jogadores existentes ficam Ativos (MembershipStatus=0, default) com
            // LastActivityAt = CreatedAt. A atividade/política real ajusta daí pra frente (Fase 2).
            migrationBuilder.Sql("UPDATE [Players] SET [LastActivityAt] = [CreatedAt] WHERE [LastActivityAt] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Players_LeagueId_MembershipStatus",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "DeactivatedAt",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "DeactivatedManually",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "MembershipStatus",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "InactivityThresholdMonths",
                table: "Leagues");

            migrationBuilder.CreateIndex(
                name: "IX_Players_LeagueId",
                table: "Players",
                column: "LeagueId");
        }
    }
}
