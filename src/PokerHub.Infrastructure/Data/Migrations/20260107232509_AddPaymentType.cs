using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ExpenseId",
                table: "Payments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Payments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_ExpenseId",
                table: "Payments",
                column: "ExpenseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_TournamentExpenses_ExpenseId",
                table: "Payments",
                column: "ExpenseId",
                principalTable: "TournamentExpenses",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_TournamentExpenses_ExpenseId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_ExpenseId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExpenseId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Payments");
        }
    }
}
