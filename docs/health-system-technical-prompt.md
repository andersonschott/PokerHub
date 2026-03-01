# 🏥 Health System - Technical Implementation Prompt

## Project Initialization Guide for Claude Code

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Complete technical specification to bootstrap the Health System project

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Solution Structure](#2-solution-structure)
3. [Layer-by-Layer Implementation](#3-layer-by-layer-implementation)
4. [Domain Layer Specification](#4-domain-layer-specification)
5. [Application Layer Specification](#5-application-layer-specification)
6. [Infrastructure Layer Specification](#6-infrastructure-layer-specification)
7. [Web API Layer Specification](#7-web-api-layer-specification)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Implementation Steps](#9-implementation-steps)
10. [Validation Checklist](#10-validation-checklist)

---

## 1. Project Overview

### 1.1 System Description

| Attribute | Value |
|-----------|-------|
| **Project Name** | Health System |
| **Type** | SaaS Multi-Tenant Healthcare Management Platform |
| **Target Users** | Brazilian healthcare professionals (doctors, psychologists, dentists, physiotherapists) |
| **Primary Functions** | Patient management, appointment scheduling, electronic medical records (EMR), financial management |
| **Compliance** | LGPD (Brazilian Data Protection Law) |

### 1.2 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│ Framework:        .NET 9                                         │
│ Architecture:     Clean Architecture + CQRS (MediatR)            │
│ ORM (Write):      Entity Framework Core 9                        │
│ ORM (Read):       Dapper 2.1+                                    │
│ Validation:       FluentValidation 11+                           │
│ Authentication:   ASP.NET Core Identity + JWT                    │
│ Background Jobs:  Hangfire 1.8+                                  │
│ Database:         SQL Server (Azure SQL)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│ Framework:        Blazor WebAssembly Standalone                  │
│ Components:       Syncfusion Blazor (Community License)          │
│ State Management: Fluxor (when needed)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Code Language Convention

- **All code:** 100% English (EN-US)
- **User Interface:** Portuguese (PT-BR)
- **Documentation:** Portuguese (PT-BR)
- **Brazilian-specific terms:** Document in XML comments

```csharp
/// <summary>
/// CPF - Cadastro de Pessoa Física (Brazilian Tax ID for individuals)
/// </summary>
public string TaxId { get; set; }

/// <summary>
/// CRM - Conselho Regional de Medicina (Regional Medical Council Number)
/// </summary>
public string CouncilNumber { get; set; }
```

### 1.4 Multi-Tenancy Strategy

| Strategy | Value |
|----------|-------|
| **Database Model** | Single Database with TenantId |
| **Isolation** | Global Query Filters |
| **Tenant Resolution** | JWT Token → TenantId claim |
| **Data Integrity** | Automatic TenantId injection on SaveChanges |

---

## 2. Solution Structure

### 2.1 Complete Folder Structure

```
HealthSystem.sln
│
├── src/
│   ├── Core/
│   │   ├── HealthSystem.Domain/
│   │   │   ├── Common/
│   │   │   │   ├── Interfaces/
│   │   │   │   │   ├── IAuditableEntity.cs
│   │   │   │   │   ├── ITenantEntity.cs
│   │   │   │   │   └── ISoftDeletable.cs
│   │   │   │   └── Base/
│   │   │   │       ├── Entity.cs
│   │   │   │       ├── AuditableEntity.cs
│   │   │   │       └── TenantEntity.cs
│   │   │   │
│   │   │   ├── Tenants/
│   │   │   │   ├── Tenant.cs
│   │   │   │   └── Enums/
│   │   │   │       ├── SubscriptionPlan.cs
│   │   │   │       └── TenantStatus.cs
│   │   │   │
│   │   │   ├── Professionals/
│   │   │   │   ├── Professional.cs
│   │   │   │   └── Enums/
│   │   │   │       ├── ProfessionalRole.cs
│   │   │   │       └── CouncilType.cs
│   │   │   │
│   │   │   ├── Patients/
│   │   │   │   ├── Patient.cs
│   │   │   │   └── Enums/
│   │   │   │       └── Gender.cs
│   │   │   │
│   │   │   ├── Appointments/
│   │   │   │   ├── Appointment.cs
│   │   │   │   └── Enums/
│   │   │   │       ├── AppointmentStatus.cs
│   │   │   │       └── AppointmentType.cs
│   │   │   │
│   │   │   ├── MedicalRecords/
│   │   │   │   ├── MedicalRecord.cs
│   │   │   │   └── Anamnesis.cs
│   │   │   │
│   │   │   └── Financial/
│   │   │       ├── Payment.cs
│   │   │       ├── HealthInsurance.cs
│   │   │       └── Enums/
│   │   │           ├── PaymentStatus.cs
│   │   │           └── PaymentMethod.cs
│   │   │
│   │   └── HealthSystem.Application/
│   │       ├── Common/
│   │       │   ├── Interfaces/
│   │       │   │   ├── IApplicationDbContext.cs
│   │       │   │   ├── IDapperContext.cs
│   │       │   │   ├── ITenantService.cs
│   │       │   │   └── ICurrentUserService.cs
│   │       │   ├── Behaviors/
│   │       │   │   ├── ValidationBehavior.cs
│   │       │   │   └── LoggingBehavior.cs
│   │       │   ├── Models/
│   │       │   │   ├── Result.cs
│   │       │   │   └── PagedList.cs
│   │       │   └── Exceptions/
│   │       │       ├── ValidationException.cs
│   │       │       ├── NotFoundException.cs
│   │       │       └── ForbiddenAccessException.cs
│   │       │
│   │       ├── Features/
│   │       │   ├── Tenants/
│   │       │   ├── Professionals/
│   │       │   ├── Patients/
│   │       │   ├── Appointments/
│   │       │   ├── MedicalRecords/
│   │       │   └── Financial/
│   │       │
│   │       └── DependencyInjection.cs
│   │
│   ├── Infrastructure/
│   │   └── HealthSystem.Infrastructure/
│   │       ├── Data/
│   │       │   ├── ApplicationDbContext.cs
│   │       │   ├── DapperContext.cs
│   │       │   ├── Configurations/
│   │       │   └── Migrations/
│   │       ├── Identity/
│   │       │   └── ApplicationUser.cs
│   │       ├── Services/
│   │       │   ├── TenantService.cs
│   │       │   └── CurrentUserService.cs
│   │       └── DependencyInjection.cs
│   │
│   └── Presentation/
│       └── HealthSystem.WebAPI/
│           ├── Controllers/
│           ├── Middleware/
│           │   ├── TenantMiddleware.cs
│           │   └── ExceptionMiddleware.cs
│           └── Program.cs
│
└── tests/
    ├── HealthSystem.UnitTests/
    └── HealthSystem.IntegrationTests/
```

### 2.2 Project References

```
HealthSystem.WebAPI
    └── HealthSystem.Infrastructure
        └── HealthSystem.Application
            └── HealthSystem.Domain
```

---

## 3. Layer-by-Layer Implementation

### 3.1 NuGet Packages by Project

#### HealthSystem.Domain.csproj
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

#### HealthSystem.Application.csproj
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="AutoMapper" Version="13.*" />
    <PackageReference Include="AutoMapper.Extensions.Microsoft.DependencyInjection" Version="12.*" />
    <PackageReference Include="FluentValidation" Version="11.*" />
    <PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="11.*" />
    <PackageReference Include="MediatR" Version="12.*" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="9.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\HealthSystem.Domain\HealthSystem.Domain.csproj" />
  </ItemGroup>
</Project>
```

#### HealthSystem.Infrastructure.csproj
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Dapper" Version="2.*" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.*" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="9.*" />
    <PackageReference Include="Hangfire.Core" Version="1.8.*" />
    <PackageReference Include="Hangfire.SqlServer" Version="1.8.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Core\HealthSystem.Application\HealthSystem.Application.csproj" />
  </ItemGroup>
</Project>
```

#### HealthSystem.WebAPI.csproj
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.*" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.*" />
    <PackageReference Include="Serilog.AspNetCore" Version="8.*" />
    <PackageReference Include="Serilog.Sinks.Console" Version="5.*" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\Infrastructure\HealthSystem.Infrastructure\HealthSystem.Infrastructure.csproj" />
  </ItemGroup>
</Project>
```

---

## 4. Domain Layer Specification

### 4.1 Base Entity Interfaces

```csharp
// IAuditableEntity.cs
namespace HealthSystem.Domain.Common.Interfaces;

public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    string? CreatedBy { get; set; }
    DateTime? UpdatedAt { get; set; }
    string? UpdatedBy { get; set; }
}

// ITenantEntity.cs
namespace HealthSystem.Domain.Common.Interfaces;

public interface ITenantEntity
{
    Guid TenantId { get; set; }
}

// ISoftDeletable.cs
namespace HealthSystem.Domain.Common.Interfaces;

public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
    string? DeletedBy { get; set; }
}
```

### 4.2 Base Entity Classes

```csharp
// Entity.cs
namespace HealthSystem.Domain.Common.Base;

public abstract class Entity
{
    public int Id { get; set; }
}

// AuditableEntity.cs
namespace HealthSystem.Domain.Common.Base;

using HealthSystem.Domain.Common.Interfaces;

public abstract class AuditableEntity : Entity, IAuditableEntity
{
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

// TenantEntity.cs
namespace HealthSystem.Domain.Common.Base;

using HealthSystem.Domain.Common.Interfaces;

public abstract class TenantEntity : AuditableEntity, ITenantEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
```

### 4.3 Main Domain Entities

#### Tenant Entity
```csharp
// Tenant.cs
namespace HealthSystem.Domain.Tenants;

using HealthSystem.Domain.Common.Interfaces;
using HealthSystem.Domain.Tenants.Enums;
using HealthSystem.Domain.Professionals;

public class Tenant : IAuditableEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Subdomain { get; set; } = string.Empty;
    
    /// <summary>
    /// CNPJ - Cadastro Nacional de Pessoa Jurídica (Brazilian Company Tax ID)
    /// </summary>
    public string? CompanyTaxId { get; set; }
    
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    // Settings
    public int DefaultAppointmentDurationMinutes { get; set; } = 30;
    public TimeSpan WorkingHoursStart { get; set; } = new TimeSpan(8, 0, 0);
    public TimeSpan WorkingHoursEnd { get; set; } = new TimeSpan(18, 0, 0);
    
    // Subscription
    public SubscriptionPlan CurrentPlan { get; set; } = SubscriptionPlan.Trial;
    public DateTime SubscriptionExpiresAt { get; set; }
    public bool IsTrial { get; set; } = true;
    public int MaxProfessionals { get; set; } = 1;
    
    // Status
    public TenantStatus Status { get; set; } = TenantStatus.Active;
    
    // Audit
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    
    // Navigation
    public ICollection<Professional> Professionals { get; set; } = new List<Professional>();
}

// SubscriptionPlan.cs
public enum SubscriptionPlan { Trial = 0, Basic = 1, Professional = 2, Enterprise = 3 }

// TenantStatus.cs
public enum TenantStatus { Active = 1, Suspended = 2, Cancelled = 3 }
```

#### Professional Entity
```csharp
// Professional.cs
namespace HealthSystem.Domain.Professionals;

using HealthSystem.Domain.Common.Base;
using HealthSystem.Domain.Professionals.Enums;

public class Professional : TenantEntity
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string ProfessionalTitle { get; set; } = string.Empty; // Dr., Dra., etc.
    public string Specialty { get; set; } = string.Empty;
    
    // Council Registration (CRM, CRP, CRO, etc.)
    public CouncilType CouncilType { get; set; }
    public string CouncilNumber { get; set; } = string.Empty;
    public string CouncilState { get; set; } = string.Empty; // UF
    
    // Contact
    public string Phone { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    
    // Settings
    public int DefaultAppointmentDurationMinutes { get; set; } = 30;
    public decimal DefaultAppointmentPrice { get; set; }
    public TimeSpan WorkingHoursStart { get; set; } = new TimeSpan(8, 0, 0);
    public TimeSpan WorkingHoursEnd { get; set; } = new TimeSpan(18, 0, 0);
    public string WorkingDaysJson { get; set; } = "[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]";
    
    // Visual
    public string? DigitalSignatureUrl { get; set; }
    public string? PhotoUrl { get; set; }
    
    // Role
    public ProfessionalRole Role { get; set; } = ProfessionalRole.Professional;
}

// ProfessionalRole.cs
public enum ProfessionalRole
{
    Owner = 1,        // Full access
    Manager = 2,      // Can manage professionals
    Professional = 3, // Own patients only
    Receptionist = 4  // Schedule only, no medical records
}

// CouncilType.cs
public enum CouncilType
{
    CRM = 1,      // Medicina
    CRP = 2,      // Psicologia
    CRO = 3,      // Odontologia
    CREFITO = 4,  // Fisioterapia
    CRN = 5,      // Nutrição
    COREN = 6,    // Enfermagem
    Other = 99
}
```

#### Patient Entity
```csharp
// Patient.cs
namespace HealthSystem.Domain.Patients;

using HealthSystem.Domain.Common.Base;
using HealthSystem.Domain.Patients.Enums;

public class Patient : TenantEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? TaxId { get; set; }       // CPF
    public string? NationalId { get; set; }  // RG
    public DateTime? BirthDate { get; set; }
    public Gender Gender { get; set; }
    
    // Contact
    public string? Phone { get; set; }
    public string? Mobile { get; set; }
    public string? WhatsApp { get; set; }
    public string? Email { get; set; }
    
    // Address
    public string? ZipCode { get; set; }     // CEP
    public string? Street { get; set; }
    public string? Number { get; set; }
    public string? Complement { get; set; }
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }       // UF
    
    // Health Insurance
    public int? HealthInsuranceId { get; set; }
    public string? InsuranceCardNumber { get; set; }
    public DateTime? InsuranceCardExpiryDate { get; set; }
    
    // Additional
    public string? PhotoUrl { get; set; }
    public string? Notes { get; set; }
    public string? Allergies { get; set; }
}

// Gender.cs
public enum Gender { NotInformed = 0, Male = 1, Female = 2, Other = 3 }
```

#### Appointment Entity
```csharp
// Appointment.cs
namespace HealthSystem.Domain.Appointments;

using HealthSystem.Domain.Common.Base;
using HealthSystem.Domain.Appointments.Enums;

public class Appointment : TenantEntity
{
    public int ProfessionalId { get; set; }
    public int PatientId { get; set; }
    
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; }
    public DateTime ScheduledEndAt => ScheduledAt.AddMinutes(DurationMinutes);
    
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public AppointmentType Type { get; set; } = AppointmentType.Private;
    
    public decimal? Price { get; set; }
    
    // WhatsApp
    public bool NotificationSent { get; set; }
    public DateTime? NotificationSentAt { get; set; }
    public bool PatientConfirmed { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }
}

// AppointmentStatus.cs
public enum AppointmentStatus
{
    Scheduled = 1, Confirmed = 2, InProgress = 3, 
    Completed = 4, Cancelled = 5, NoShow = 6
}

// AppointmentType.cs
public enum AppointmentType { Private = 1, Insurance = 2, Courtesy = 3 }
```

#### MedicalRecord Entity
```csharp
// MedicalRecord.cs
namespace HealthSystem.Domain.MedicalRecords;

using HealthSystem.Domain.Common.Base;

public class MedicalRecord : TenantEntity
{
    public int ProfessionalId { get; set; }
    public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    
    public DateTime RecordDate { get; set; }
    
    // Anamnesis
    public string? ChiefComplaint { get; set; }
    public string? HistoryOfPresentIllness { get; set; }
    
    // Vital Signs
    public string? BloodPressure { get; set; }
    public decimal? Temperature { get; set; }
    public int? HeartRate { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? Weight { get; set; }
    public decimal? Height { get; set; }
    public decimal? BMI { get; set; }
    
    // Assessment
    public string? PhysicalExam { get; set; }
    public string? Diagnosis { get; set; }
    public string? ICD10Code { get; set; }
    
    // Plan
    public string? Treatment { get; set; }
    public string? Prescription { get; set; }
    public string? Notes { get; set; }
    
    // Signature
    public bool IsSigned { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? SignedBy { get; set; }
}
```

#### Financial Entities
```csharp
// Payment.cs
namespace HealthSystem.Domain.Financial;

using HealthSystem.Domain.Common.Base;
using HealthSystem.Domain.Financial.Enums;

public class Payment : TenantEntity
{
    public int? AppointmentId { get; set; }
    public int? PatientId { get; set; }
    public int? HealthInsuranceId { get; set; }
    
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public PaymentMethod? Method { get; set; }
    
    public string? GuideNumber { get; set; }  // Número da Guia
    public string? Description { get; set; }
    public string? Notes { get; set; }
}

// HealthInsurance.cs
public class HealthInsurance : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? CompanyTaxId { get; set; }        // CNPJ
    public string? RegulatoryAgencyNumber { get; set; } // ANS
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal DefaultAppointmentPrice { get; set; }
    public int PaymentTermDays { get; set; } = 30;
}

// PaymentStatus.cs
public enum PaymentStatus { Pending = 1, Paid = 2, Overdue = 3, Cancelled = 4 }

// PaymentMethod.cs
public enum PaymentMethod { Cash = 1, DebitCard = 2, CreditCard = 3, PIX = 4, BankTransfer = 5, Insurance = 6 }
```

---

## 5. Application Layer Specification

### 5.1 Common Interfaces

```csharp
// IApplicationDbContext.cs
namespace HealthSystem.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<Professional> Professionals { get; }
    DbSet<Patient> Patients { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<MedicalRecord> MedicalRecords { get; }
    DbSet<Payment> Payments { get; }
    DbSet<HealthInsurance> HealthInsurances { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

// IDapperContext.cs
public interface IDapperContext
{
    IDbConnection CreateConnection();
    Guid CurrentTenantId { get; }
}

// ITenantService.cs
public interface ITenantService
{
    Guid GetCurrentTenantId();
    void SetCurrentTenantId(Guid tenantId);
    int? GetCurrentProfessionalId();
    ProfessionalRole? GetCurrentUserRole();
    bool CanAccessAllProfessionals();
}

// ICurrentUserService.cs
public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    bool IsAuthenticated { get; }
}

// IDateTimeService.cs
public interface IDateTimeService
{
    DateTime Now { get; }
    DateTime UtcNow { get; }
}
```

### 5.2 Result Pattern

```csharp
// Result.cs
namespace HealthSystem.Application.Common.Models;

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string? Error { get; }
    public string[]? Errors { get; }

    protected Result(bool isSuccess, string? error = null, string[]? errors = null)
    {
        IsSuccess = isSuccess;
        Error = error;
        Errors = errors;
    }

    public static Result Success() => new(true);
    public static Result Failure(string error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value, true);
    public static Result<T> Failure<T>(string error) => new(default, false, error);
}

public class Result<T> : Result
{
    public T? Value { get; }

    protected internal Result(T? value, bool isSuccess, string? error = null, string[]? errors = null) 
        : base(isSuccess, error, errors)
    {
        Value = value;
    }
}
```

### 5.3 Pagination

```csharp
// PagedList.cs
public class PagedList<T>
{
    public List<T> Items { get; }
    public int PageNumber { get; }
    public int PageSize { get; }
    public int TotalCount { get; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedList(List<T> items, int totalCount, int pageNumber, int pageSize)
    {
        Items = items;
        TotalCount = totalCount;
        PageNumber = pageNumber;
        PageSize = pageSize;
    }
}
```

### 5.4 MediatR Behaviors

```csharp
// ValidationBehavior.cs
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (_validators.Any())
        {
            var context = new ValidationContext<TRequest>(request);
            var validationResults = await Task.WhenAll(
                _validators.Select(v => v.ValidateAsync(context, cancellationToken)));
            var failures = validationResults.SelectMany(r => r.Errors).Where(f => f != null).ToList();

            if (failures.Count != 0)
                throw new ValidationException(failures);
        }
        return await next();
    }
}
```

### 5.5 Example: Create Patient Command

```csharp
// CreatePatientCommand.cs
public record CreatePatientCommand : IRequest<Result<int>>
{
    public string FullName { get; init; } = string.Empty;
    public string? TaxId { get; init; }
    public DateTime? BirthDate { get; init; }
    public Gender Gender { get; init; }
    public string? Mobile { get; init; }
    public string? Email { get; init; }
    public int? HealthInsuranceId { get; init; }
}

// CreatePatientCommandValidator.cs
public class CreatePatientCommandValidator : AbstractValidator<CreatePatientCommand>
{
    public CreatePatientCommandValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Nome completo é obrigatório")
            .MaximumLength(200);

        RuleFor(x => x.TaxId)
            .Matches(@"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$")
            .When(x => !string.IsNullOrEmpty(x.TaxId))
            .WithMessage("CPF inválido");

        RuleFor(x => x.Email)
            .EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

// CreatePatientCommandHandler.cs
public class CreatePatientCommandHandler : IRequestHandler<CreatePatientCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;

    public CreatePatientCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<int>> Handle(CreatePatientCommand request, CancellationToken cancellationToken)
    {
        var patient = new Patient
        {
            FullName = request.FullName,
            TaxId = request.TaxId?.Replace(".", "").Replace("-", ""),
            BirthDate = request.BirthDate,
            Gender = request.Gender,
            Mobile = request.Mobile,
            Email = request.Email,
            HealthInsuranceId = request.HealthInsuranceId
        };

        _context.Patients.Add(patient);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(patient.Id);
    }
}
```

### 5.6 Example: Get Patients Query (Dapper)

```csharp
// GetPatientsQuery.cs
public record GetPatientsQuery : IRequest<Result<PagedList<PatientListDto>>>
{
    public string? SearchTerm { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

// PatientListDto.cs
public record PatientListDto
{
    public int Id { get; init; }
    public string FullName { get; init; } = string.Empty;
    public DateTime? BirthDate { get; init; }
    public int? Age => BirthDate.HasValue ? (int)((DateTime.Today - BirthDate.Value).TotalDays / 365.25) : null;
    public Gender Gender { get; init; }
    public string? Mobile { get; init; }
    public string? HealthInsuranceName { get; init; }
}

// GetPatientsQueryHandler.cs
public class GetPatientsQueryHandler : IRequestHandler<GetPatientsQuery, Result<PagedList<PatientListDto>>>
{
    private readonly IDapperContext _dapper;

    public GetPatientsQueryHandler(IDapperContext dapper)
    {
        _dapper = dapper;
    }

    public async Task<Result<PagedList<PatientListDto>>> Handle(GetPatientsQuery request, CancellationToken cancellationToken)
    {
        using var connection = _dapper.CreateConnection();

        var sql = @"
            SELECT p.Id, p.FullName, p.BirthDate, p.Gender, p.Mobile, hi.Name AS HealthInsuranceName
            FROM Patients p
            LEFT JOIN HealthInsurances hi ON p.HealthInsuranceId = hi.Id
            WHERE p.TenantId = @TenantId AND p.IsDeleted = 0
              AND (@SearchTerm IS NULL OR p.FullName LIKE '%' + @SearchTerm + '%')
            ORDER BY p.FullName
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

            SELECT COUNT(*) FROM Patients p 
            WHERE p.TenantId = @TenantId AND p.IsDeleted = 0
              AND (@SearchTerm IS NULL OR p.FullName LIKE '%' + @SearchTerm + '%');";

        var parameters = new { TenantId = _dapper.CurrentTenantId, request.SearchTerm, 
            Offset = (request.PageNumber - 1) * request.PageSize, request.PageSize };

        using var multi = await connection.QueryMultipleAsync(sql, parameters);
        var patients = (await multi.ReadAsync<PatientListDto>()).ToList();
        var totalCount = await multi.ReadSingleAsync<int>();

        return Result.Success(new PagedList<PatientListDto>(patients, totalCount, request.PageNumber, request.PageSize));
    }
}
```

### 5.7 DependencyInjection.cs

```csharp
namespace HealthSystem.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddAutoMapper(Assembly.GetExecutingAssembly());
        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        });
        return services;
    }
}
```

---

## 6. Infrastructure Layer Specification

### 6.1 ApplicationDbContext

```csharp
namespace HealthSystem.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    private readonly ITenantService _tenantService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options,
        ITenantService tenantService, ICurrentUserService currentUserService, 
        IDateTimeService dateTimeService) : base(options)
    {
        _tenantService = tenantService;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<HealthInsurance> HealthInsurances => Set<HealthInsurance>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        ApplyGlobalFilters(builder);
    }

    private void ApplyGlobalFilters(ModelBuilder builder)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        builder.Entity<Professional>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
        builder.Entity<Patient>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
        builder.Entity<Appointment>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
        builder.Entity<MedicalRecord>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
        builder.Entity<Payment>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
        builder.Entity<HealthInsurance>().HasQueryFilter(e => e.TenantId == tenantId && !e.IsDeleted);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var userId = _currentUserService.UserId;
        var now = _dateTimeService.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is ITenantEntity tenantEntity && entry.State == EntityState.Added)
                tenantEntity.TenantId = tenantId;

            if (entry.Entity is IAuditableEntity auditable)
            {
                if (entry.State == EntityState.Added)
                {
                    auditable.CreatedAt = now;
                    auditable.CreatedBy = userId;
                }
                else if (entry.State == EntityState.Modified)
                {
                    auditable.UpdatedAt = now;
                    auditable.UpdatedBy = userId;
                }
            }

            if (entry.Entity is ISoftDeletable deletable && entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                deletable.IsDeleted = true;
                deletable.DeletedAt = now;
                deletable.DeletedBy = userId;
            }
        }
        return await base.SaveChangesAsync(cancellationToken);
    }
}
```

### 6.2 DapperContext

```csharp
public class DapperContext : IDapperContext
{
    private readonly IConfiguration _configuration;
    private readonly ITenantService _tenantService;

    public DapperContext(IConfiguration configuration, ITenantService tenantService)
    {
        _configuration = configuration;
        _tenantService = tenantService;
    }

    public IDbConnection CreateConnection()
        => new SqlConnection(_configuration.GetConnectionString("DefaultConnection"));

    public Guid CurrentTenantId => _tenantService.GetCurrentTenantId();
}
```

### 6.3 Example Entity Configuration

```csharp
// PatientConfiguration.cs
public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patients");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.FullName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.TaxId).HasMaxLength(14).HasColumnName("CPF");
        builder.Property(e => e.NationalId).HasMaxLength(20).HasColumnName("RG");
        builder.Property(e => e.Mobile).HasMaxLength(20);
        builder.Property(e => e.Email).HasMaxLength(256);
        builder.Property(e => e.ZipCode).HasMaxLength(10).HasColumnName("CEP");
        builder.Property(e => e.State).HasMaxLength(2).HasColumnName("UF");

        builder.HasIndex(e => e.TenantId);
        builder.HasIndex(e => new { e.TenantId, e.TaxId }).IsUnique()
            .HasFilter("[CPF] IS NOT NULL AND [IsDeleted] = 0");

        builder.HasOne(e => e.HealthInsurance).WithMany(e => e.Patients)
            .HasForeignKey(e => e.HealthInsuranceId).OnDelete(DeleteBehavior.SetNull);
    }
}
```

### 6.4 TenantService

```csharp
public class TenantService : ITenantService
{
    private Guid _currentTenantId;
    private int? _currentProfessionalId;
    private ProfessionalRole? _currentUserRole;

    public Guid GetCurrentTenantId() => _currentTenantId;
    public void SetCurrentTenantId(Guid tenantId) => _currentTenantId = tenantId;
    public int? GetCurrentProfessionalId() => _currentProfessionalId;
    public void SetCurrentProfessionalId(int? id) => _currentProfessionalId = id;
    public ProfessionalRole? GetCurrentUserRole() => _currentUserRole;
    public void SetCurrentUserRole(ProfessionalRole? role) => _currentUserRole = role;
    
    public bool CanAccessAllProfessionals() => _currentUserRole is 
        ProfessionalRole.Owner or ProfessionalRole.Manager or ProfessionalRole.Receptionist;
}
```

### 6.5 Identity

```csharp
public class ApplicationUser : IdentityUser
{
    public Guid? TenantId { get; set; }
    public int? ProfessionalId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
```

### 6.6 DependencyInjection.cs

```csharp
namespace HealthSystem.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));
        services.AddScoped<IApplicationDbContext>(p => p.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IDapperContext, DapperContext>();

        // Identity
        services.AddIdentity<ApplicationUser, IdentityRole>(options => {
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // JWT
        var jwtSettings = configuration.GetSection("JwtSettings");
        services.AddAuthentication(o => {
            o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(o => {
            o.TokenValidationParameters = new TokenValidationParameters {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtSettings["Issuer"],
                ValidAudience = jwtSettings["Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!))
            };
        });

        // Services
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IDateTimeService, DateTimeService>();

        return services;
    }
}
```

---

## 7. Web API Layer Specification

### 7.1 Program.cs

```csharp
using Serilog;
using HealthSystem.Application;
using HealthSystem.Infrastructure;
using HealthSystem.WebAPI.Middleware;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();

builder.Services.AddCors(o => o.AddPolicy("AllowBlazor", p => 
    p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [])
     .AllowAnyMethod().AllowAnyHeader().AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowBlazor");
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<TenantMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### 7.2 TenantMiddleware

```csharp
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantService tenantService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;
            if (Guid.TryParse(tenantIdClaim, out var tenantId))
                tenantService.SetCurrentTenantId(tenantId);

            if (tenantService is TenantService ts)
            {
                var professionalIdClaim = context.User.FindFirst("professional_id")?.Value;
                if (int.TryParse(professionalIdClaim, out var professionalId))
                    ts.SetCurrentProfessionalId(professionalId);

                var roleClaim = context.User.FindFirst("professional_role")?.Value;
                if (Enum.TryParse<ProfessionalRole>(roleClaim, out var role))
                    ts.SetCurrentUserRole(role);
            }
        }
        await _next(context);
    }
}
```

### 7.3 ExceptionMiddleware

```csharp
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        var (statusCode, response) = exception switch
        {
            ValidationException v => (400, new { Status = 400, Message = "Validation failed", v.Errors }),
            NotFoundException n => (404, new { Status = 404, Message = n.Message, Errors = (object?)null }),
            ForbiddenAccessException f => (403, new { Status = 403, Message = f.Message, Errors = (object?)null }),
            _ => (500, new { Status = 500, Message = "An error occurred", Errors = (object?)null })
        };
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
```

### 7.4 Example Controller

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly IMediator _mediator;
    public PatientsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetPatients([FromQuery] GetPatientsQuery query)
    {
        var result = await _mediator.Send(query);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePatient([FromBody] CreatePatientCommand command)
    {
        var result = await _mediator.Send(command);
        return result.IsSuccess 
            ? CreatedAtAction(nameof(GetPatients), new { id = result.Value }, result.Value) 
            : BadRequest(result.Error);
    }
}
```

### 7.5 appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=HealthSystem;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyAtLeast32Characters!",
    "Issuer": "HealthSystem",
    "Audience": "HealthSystemApp",
    "ExpirationInMinutes": 60
  },
  "AllowedOrigins": ["https://localhost:7001"],
  "Serilog": {
    "MinimumLevel": { "Default": "Information" }
  }
}
```

---

## 8. Cross-Cutting Concerns

### 8.1 Role-Based Access Control

| Feature | Owner | Manager | Professional | Receptionist |
|---------|-------|---------|--------------|--------------|
| Tenant Settings | ✅ | ❌ | ❌ | ❌ |
| Professionals CRUD | ✅ | ✅ View/Edit | ❌ Own Profile | ❌ View |
| Patients | ✅ All | ✅ All | ⚠️ Own Only | ✅ All |
| Appointments | ✅ All | ✅ All | ⚠️ Own Only | ✅ All |
| Medical Records | ✅ All | ✅ All | ⚠️ Own Only | ❌ |
| Financial | ✅ All | ✅ All | ⚠️ Own Only | ✅ View |

### 8.2 Brazilian Validations

| Field | Format | Example |
|-------|--------|---------|
| CPF | 000.000.000-00 | 123.456.789-09 |
| CNPJ | 00.000.000/0000-00 | 12.345.678/0001-90 |
| Phone | (00) 0000-0000 | (11) 3456-7890 |
| Mobile | (00) 00000-0000 | (11) 98765-4321 |
| CEP | 00000-000 | 01310-100 |
| UF | XX | SP, RJ, MG |

---

## 9. Implementation Steps

### Step 1: Create Solution

```bash
dotnet new sln -n HealthSystem
dotnet new classlib -n HealthSystem.Domain -o src/Core/HealthSystem.Domain
dotnet new classlib -n HealthSystem.Application -o src/Core/HealthSystem.Application
dotnet new classlib -n HealthSystem.Infrastructure -o src/Infrastructure/HealthSystem.Infrastructure
dotnet new webapi -n HealthSystem.WebAPI -o src/Presentation/HealthSystem.WebAPI

dotnet sln add src/Core/HealthSystem.Domain
dotnet sln add src/Core/HealthSystem.Application
dotnet sln add src/Infrastructure/HealthSystem.Infrastructure
dotnet sln add src/Presentation/HealthSystem.WebAPI
```

### Step 2: Add References

```bash
cd src/Core/HealthSystem.Application
dotnet add reference ../HealthSystem.Domain

cd ../../Infrastructure/HealthSystem.Infrastructure
dotnet add reference ../Core/HealthSystem.Application

cd ../../Presentation/HealthSystem.WebAPI
dotnet add reference ../../Infrastructure/HealthSystem.Infrastructure
```

### Step 3: Install Packages

```bash
# Application
cd src/Core/HealthSystem.Application
dotnet add package MediatR
dotnet add package FluentValidation
dotnet add package FluentValidation.DependencyInjectionExtensions
dotnet add package AutoMapper
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection

# Infrastructure
cd ../../Infrastructure/HealthSystem.Infrastructure
dotnet add package Dapper
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer

# WebAPI
cd ../../Presentation/HealthSystem.WebAPI
dotnet add package Swashbuckle.AspNetCore
dotnet add package Serilog.AspNetCore
```

### Step 4: Create Migration

```bash
cd src/Presentation/HealthSystem.WebAPI
dotnet ef migrations add InitialCreate --project ../../Infrastructure/HealthSystem.Infrastructure
dotnet ef database update --project ../../Infrastructure/HealthSystem.Infrastructure
```

---

## 10. Validation Checklist

### Architecture
- [ ] Domain has no external dependencies
- [ ] Application depends only on Domain
- [ ] Infrastructure depends on Application
- [ ] WebAPI depends on Infrastructure
- [ ] No circular dependencies

### Multi-Tenancy
- [ ] All tenant entities have TenantId
- [ ] Global Query Filters applied
- [ ] TenantId auto-set on SaveChanges
- [ ] Dapper queries include TenantId
- [ ] JWT contains tenant_id claim

### CQRS
- [ ] Commands use EF Core
- [ ] Queries use Dapper
- [ ] MediatR configured
- [ ] ValidationBehavior registered
- [ ] LoggingBehavior registered

### Security
- [ ] JWT configured
- [ ] Role-based authorization
- [ ] Audit fields populated
- [ ] Soft delete implemented

---

**End of Specification**

*Follow the implementation steps in order and use the validation checklist to ensure quality.*
