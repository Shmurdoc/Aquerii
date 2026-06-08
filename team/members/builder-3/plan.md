---
ticket: PROD-WORKER-001
priority: high
est_hours: 5
state: assigned
---

# builder-3 — Worker Model Enhancement + Expiry Notification Pipeline

## Objective
Extend WorkspaceMember with mining-specific fields, build SA ID validation, build the tiered expiry notification pipeline.

## Acceptance Criteria
1. Add migration to extend workspace_members:
   - badge_id (string, nullable)
   - employment_type (enum: permanent, fixed_term, labour_broker, subcontractor)
   - labour_broker_company (string, nullable)
   - union_membership (string, nullable)
   - blood_type (string, nullable)
   - emergency_contact_name, emergency_contact_phone (string)
   - site_induction_date (date, nullable)
   - site_induction_expiry (date, nullable)
2. Create `App\Rules\SaIdNumber` validation rule:
   - 13-digit SA ID validation with Luhn checksum
   - Date of birth extraction (digits 0-5)
   - Gender detection (digit 6)
   - Citizenship detection (digit 10)
3. Add `overall_compliance_status` to workspace_members table (enum, nullable)
4. Build tiered expiry notification system:
   - `app:check-cert-expiry` command that checks ALL certs daily
   - 90 days: email to HSSE officer
   - 30 days: email + SMS to HSSE officer + contractor admin
   - 7 days: email + SMS + in-app notification to supervisor
   - 0 days: auto-flip worker to non_compliant, notify all parties
5. Create notification templates for each tier
6. Add SMS delivery via Vonage/Twilio (use existing notification channel)
7. Write Pest tests (minimum 8) covering SA ID validation, expiry notifications

## Context Files
- C:\Users\madoc\source\repos\Aquerii\services\api\app\Core\Models\WorkspaceMember.php
- C:\Users\madoc\source\repos\Aquerii\services\api\database\migrations\
- C:\Users\madoc\source\repos\Aquerii\services\api\routes\console.php
- C:\Users\madoc\source\repos\Aquerii\services\api\config\notifications.php (or mail.php)
- C:\Users\madoc\source\repos\Aquerii\ALIGNED-PLAN.md

## Quality Gates
- `php artisan migrate` runs clean
- `composer test` doesn't break existing tests
- SA ID validation: correct IDs pass, incorrect IDs fail
- Notification command sends correct tiered alerts
