using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPrizeDistributionTypeAndUsePrizeTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrizeDistributionType",
                table: "Tournaments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "UsePrizeTable",
                table: "Tournaments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrizeDistributionType",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "UsePrizeTable",
                table: "Tournaments");
        }
    }
}
