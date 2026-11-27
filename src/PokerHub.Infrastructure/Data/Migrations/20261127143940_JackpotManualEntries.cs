using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class JackpotManualEntries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JackpotContributions_TournamentId",
                table: "JackpotContributions");

            migrationBuilder.AlterColumn<Guid>(
                name: "TournamentId",
                table: "JackpotContributions",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "JackpotContributions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JackpotContributions_TournamentId",
                table: "JackpotContributions",
                column: "TournamentId",
                unique: true,
                filter: "[TournamentId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JackpotContributions_TournamentId",
                table: "JackpotContributions");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "JackpotContributions");

            migrationBuilder.AlterColumn<Guid>(
                name: "TournamentId",
                table: "JackpotContributions",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JackpotContributions_TournamentId",
                table: "JackpotContributions",
                column: "TournamentId",
                unique: true);
        }
    }
}
