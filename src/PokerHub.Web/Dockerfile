FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/PokerHub.Web/PokerHub.Web.csproj", "src/PokerHub.Web/"]
RUN dotnet restore "src/PokerHub.Web/PokerHub.Web.csproj"
COPY . .
WORKDIR "/src/src/PokerHub.Web"
RUN dotnet build "./PokerHub.Web.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./PokerHub.Web.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PokerHub.Web.dll"]
