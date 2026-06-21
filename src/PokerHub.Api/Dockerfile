# Runtime base image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy project files for restore (Api + its project references)
COPY ["src/PokerHub.Api/PokerHub.Api.csproj", "src/PokerHub.Api/"]
COPY ["src/PokerHub.Application/PokerHub.Application.csproj", "src/PokerHub.Application/"]
COPY ["src/PokerHub.Infrastructure/PokerHub.Infrastructure.csproj", "src/PokerHub.Infrastructure/"]
COPY ["src/PokerHub.Domain/PokerHub.Domain.csproj", "src/PokerHub.Domain/"]

RUN dotnet restore "src/PokerHub.Api/PokerHub.Api.csproj"

# Copy the rest of the source and publish
COPY . .
WORKDIR "/src/src/PokerHub.Api"
RUN dotnet publish "PokerHub.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final runtime stage
FROM base AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PokerHub.Api.dll"]
