# Local simulated station logins

> Local simulated testing only. These accounts are not real rescue personnel and are not for operational use.

- Created: 2026-10-11 02:00 PST
- MongoDB database: `resqph` (local Docker Compose replica set; no database credentials are stored here)
- Login URL: http://localhost:5173/login?role=rescuer

## Accounts created during this task

| Station | Station ID | Email | Password |
|---|---|---|---|
| Sampaloc Fire Station | `sampaloc-fire-station` | `resqph.demo.sampaloc-fire-station@example.test` | `JAynWAVq9zLLSx-gkxbHgXc7T_RvtNWEmxHXMY53` |
| Central Sampaloc Fire and Rescue Volunteer Brigade | `central-sampaloc-algeciras` | `resqph.demo.central-sampaloc-algeciras@example.test` | `XpQY1zCdNyzMgh2eeD515mJ6y0KLTl36_kP35hNe` |
| Central Sampaloc Fire and Rescue Brigade Headquarters | `central-sampaloc-lacson-hq` | `resqph.demo.central-sampaloc-lacson-hq@example.test` | `nY9Ipxz_LYJskv54BSL-T4ckdKLeucF3Ta4ci9rw` |
| Iverson Fire and Rescue Volunteer | `iverson-fire-rescue` | `resqph.demo.iverson-fire-rescue@example.test` | `1guH8HbhrwjLPO-golYugCwYSBtdBset1NXkDPv5` |
| David Fire and Rescue Volunteer Inc. Headquarters | `david-fire-rescue-hq` | `resqph.demo.david-fire-rescue-hq@example.test` | `lyH5tDnf9Ti_ItpG1eKlC6WR-vCEFBo4LFlHVN7Q` |

## Copyable station credentials

```text
Station: Sampaloc Fire Station
Email: resqph.demo.sampaloc-fire-station@example.test
Password: JAynWAVq9zLLSx-gkxbHgXc7T_RvtNWEmxHXMY53
Login dropdown selection: Sampaloc Fire Station
```

```text
Station: Central Sampaloc Fire and Rescue Volunteer Brigade
Email: resqph.demo.central-sampaloc-algeciras@example.test
Password: XpQY1zCdNyzMgh2eeD515mJ6y0KLTl36_kP35hNe
Login dropdown selection: Central Sampaloc Fire and Rescue Volunteer Brigade
```

```text
Station: Central Sampaloc Fire and Rescue Brigade Headquarters
Email: resqph.demo.central-sampaloc-lacson-hq@example.test
Password: nY9Ipxz_LYJskv54BSL-T4ckdKLeucF3Ta4ci9rw
Login dropdown selection: Central Sampaloc Fire and Rescue Brigade Headquarters
```

```text
Station: Iverson Fire and Rescue Volunteer
Email: resqph.demo.iverson-fire-rescue@example.test
Password: 1guH8HbhrwjLPO-golYugCwYSBtdBset1NXkDPv5
Login dropdown selection: Iverson Fire and Rescue Volunteer
```

```text
Station: David Fire and Rescue Volunteer Inc. Headquarters
Email: resqph.demo.david-fire-rescue-hq@example.test
Password: lyH5tDnf9Ti_ItpG1eKlC6WR-vCEFBo4LFlHVN7Q
Login dropdown selection: David Fire and Rescue Volunteer Inc. Headquarters
```

## Start and sign in

1. From the repository root, run `./dev.sh` and wait for the frontend and backend ready messages.
2. Open the login URL above, choose the station/rescuer login entry, and enter that station’s email and password.
3. Select the exact matching station name in the dropdown. The selection confirms the account’s saved membership; it does not grant membership.
4. Use a separate browser profile for citizen signup and testing so the citizen and station sessions do not replace one another.

## Provision or reset a local station account later

From `backend/`, the existing commands are:

```sh
uv run python -m app.management.provision_station_account EMAIL "Station Rescuer" STATION_ID
uv run python -m app.management.reset_station_password EMAIL STATION_ID
```
Both commands prompt for a password without echoing it. Provisioning refuses an existing station account. Reset only after confirming the exact existing email and station membership.

These accounts and password hashes live in this local database. Checking out the Git branch on another computer does not copy the database or these credentials.

## Local simulated citizen login

This account is for local simulated testing only.

```text
Role: Citizen
Email: resqph.demo.citizen@example.test
Password: u5oTzN0FFDVTKYXJBkIvj_ZLiytg9EAg0jbtDFsG
Login URL: http://localhost:5173/login?role=citizen
```

Use a separate browser profile from rescuer testing so the sessions do not replace one another.
