# Runtime base image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 8080

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy all project files for restore (includes all dependencies)
COPY ["src/PokerHub.Web/PokerHub.Web.csproj", "src/PokerHub.Web/"]
COPY ["src/PokerHub.Application/PokerHub.Application.csproj", "src/PokerHub.Application/"]
COPY ["src/PokerHub.Domain/PokerHub.Domain.csproj", "src/PokerHub.Domain/"]
COPY ["src/PokerHub.Infrastructure/PokerHub.Infrastructure.csproj", "src/PokerHub.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "src/PokerHub.Web/PokerHub.Web.csproj"

# Copy all source code
COPY . .

# Build the application
WORKDIR "/src/src/PokerHub.Web"
RUN dotnet build "PokerHub.Web.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "PokerHub.Web.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final runtime stage
FROM base AS final
WORKDIR /app

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Copy published application
COPY --from=publish /app/publish .

# Start application
ENTRYPOINT ["dotnet", "PokerHub.Web.dll"]
