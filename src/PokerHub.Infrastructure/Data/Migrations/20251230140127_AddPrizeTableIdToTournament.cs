using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPrizeTableIdToTournament : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrizeTableId",
                table: "Tournaments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_PrizeTableId",
                table: "Tournaments",
                column: "PrizeTableId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tournaments_LeaguePrizeTables_PrizeTableId",
                table: "Tournaments",
                column: "PrizeTableId",
                principalTable: "LeaguePrizeTables",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tournaments_LeaguePrizeTables_PrizeTableId",
                table: "Tournaments");

            migrationBuilder.DropIndex(
                name: "IX_Tournaments_PrizeTableId",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "PrizeTableId",
                table: "Tournaments");
        }
    }
}
