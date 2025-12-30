using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PokerHub.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSeasonsJackpotAndPrizeTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AccumulatedPrizePool",
                table: "Leagues",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "JackpotPercentage",
                table: "Leagues",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "JackpotContributions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeagueId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TournamentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TournamentPrizePool = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PercentageApplied = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JackpotContributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JackpotContributions_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JackpotContributions_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LeaguePrizeTables",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeagueId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PrizePoolTotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    JackpotAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaguePrizeTables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaguePrizeTables_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Seasons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeagueId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Seasons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Seasons_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeaguePrizeTableEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LeaguePrizeTableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    PrizeAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaguePrizeTableEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaguePrizeTableEntries_LeaguePrizeTables_LeaguePrizeTableId",
                        column: x => x.LeaguePrizeTableId,
                        principalTable: "LeaguePrizeTables",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JackpotContributions_LeagueId",
                table: "JackpotContributions",
                column: "LeagueId");

            migrationBuilder.CreateIndex(
                name: "IX_JackpotContributions_TournamentId",
                table: "JackpotContributions",
                column: "TournamentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeaguePrizeTableEntries_LeaguePrizeTableId_Position",
                table: "LeaguePrizeTableEntries",
                columns: new[] { "LeaguePrizeTableId", "Position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LeaguePrizeTables_LeagueId_PrizePoolTotal",
                table: "LeaguePrizeTables",
                columns: new[] { "LeagueId", "PrizePoolTotal" });

            migrationBuilder.CreateIndex(
                name: "IX_Seasons_LeagueId_StartDate_EndDate",
                table: "Seasons",
                columns: new[] { "LeagueId", "StartDate", "EndDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JackpotContributions");

            migrationBuilder.DropTable(
                name: "LeaguePrizeTableEntries");

            migrationBuilder.DropTable(
                name: "Seasons");

            migrationBuilder.DropTable(
                name: "LeaguePrizeTables");

            migrationBuilder.DropColumn(
                name: "AccumulatedPrizePool",
                table: "Leagues");

            migrationBuilder.DropColumn(
                name: "JackpotPercentage",
                table: "Leagues");
        }
    }
}
