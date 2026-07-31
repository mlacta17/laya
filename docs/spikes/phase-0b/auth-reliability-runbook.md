# Authentication reliability runbook

Status: **United States complete for both providers; Philippines blocked pending
a trusted in-country run**

This runbook standardizes AUTH-15 (United States) and AUTH-16 (Philippines).
It is evidence collection for disposable development applications, not
production monitoring or a substitute for the Expo device gates.

## Pass condition

For each provider and location, three consecutive critical-flow runs complete
without an unexplained retry:

1. provider-owned sign-in returns to the Laya browser harness;
2. the harness obtains a token and the isolated Laya Worker returns HTTP 200;
3. refresh restores the signed-in session;
4. closing the application tab, opening a new tab, and revisiting the origin
   restores the signed-in session;
5. logout returns to the signed-out state;
6. refresh does not silently restore the logged-out session; and
7. closing/reopening the tab also remains signed out.

At least one of the three runs uses passwordless email and at least one uses
Google. Provider, location, connection, method, elapsed times, retries, and
unexpected behavior are recorded. A run interrupted by the tester or device is
repeated but retained as an observation rather than silently discarded.

## Privacy and security

- Use a disposable non-administrator identity.
- Never record a complete token, authorization code, cookie, email code,
  passwordless link, email address, provider user ID, or tenant hostname.
- Do not use a VPN as Philippine evidence. The tester and device must actually
  be on a Philippine connection.
- Record the network category and provider only with the tester's permission.
  Do not record a street address or precise location.
- Screenshots must be cropped and sanitized under `evidence/README.md`.

## Run record

Copy this section once per provider, location, and run number.

### Run `<provider>-<country>-<1|2|3>`

| Field | Observation |
| --- | --- |
| Date and local time | |
| Provider | Auth0 / Clerk |
| Method | Passwordless email / Google |
| Browser and version | |
| Device and OS | |
| Country | United States / Philippines |
| Connection | Home Wi-Fi / mobile data / other |
| Network provider, if permitted | |
| Sign-in elapsed time | |
| Worker status | |
| Refresh restore elapsed time | |
| Close/reopen restore elapsed time | |
| Logout elapsed time | |
| Signed out after refresh | |
| Signed out after close/reopen | |
| Email delivery elapsed time, if applicable | |
| Inbox/spam result, if applicable | |
| Retry count | |
| Unexpected behavior | |
| Result | Pass / Fail / Blocked |

## United States execution

Run the disposable Auth0 harness at `http://localhost:5173` with its isolated
Worker on port `8791`. Run the Clerk harness at `http://localhost:5174` with
its isolated Worker on port `8790`.

Localhost is appropriate because the operator and development machine are in
the United States. Record three consecutive runs for each provider.

### Run `auth0-us-1`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-29; local time not recorded |
| Provider | Auth0 |
| Method | Google |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 6.27 seconds |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 1.61 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | Not applicable |
| Inbox/spam result, if applicable | Not applicable |
| Retry count | 0 |
| Unexpected behavior | None |
| Result | Pass |

### Run `auth0-us-2`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-29; local time not recorded |
| Provider | Auth0 |
| Method | Passwordless email |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 5.34 seconds total |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 0.84 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | 4.16 seconds |
| Inbox/spam result, if applicable | Spam |
| Retry count | 0 |
| Unexpected behavior | Development email arrived in spam |
| Result | Pass |

### Run `auth0-us-3`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-29; local time not recorded |
| Provider | Auth0 |
| Method | Google |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 4.22 seconds |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 0.68 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | Not applicable |
| Inbox/spam result, if applicable | Not applicable |
| Retry count | 0 |
| Unexpected behavior | None |
| Result | Pass |

### Auth0 US conclusion

Result: **Pass**

Three consecutive runs completed without a retry. Google and passwordless email
both completed the full sign-in, Worker HTTP 200, refresh restore, close/reopen
restore, logout, and persistent signed-out sequence. The Auth0 development email
arrived quickly but landed in spam; production email remains a separate
AUTH-19 gate.

### Run `clerk-us-1`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-29; local time not recorded |
| Provider | Clerk |
| Method | Google |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 4.32 seconds |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 0.84 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | Not applicable |
| Inbox/spam result, if applicable | Not applicable |
| Retry count | 0 |
| Unexpected behavior | None |
| Result | Pass |

### Run `clerk-us-2`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-29; local time not recorded |
| Provider | Clerk |
| Method | Passwordless email |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 6.17 seconds total |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 1.04 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | 4.54 seconds |
| Inbox/spam result, if applicable | Inbox |
| Retry count | 0 |
| Unexpected behavior | None |
| Result | Pass |

### Run `clerk-us-3`

| Field | Observation |
| --- | --- |
| Date and local time | 2026-07-30; local time not recorded |
| Provider | Clerk |
| Method | Google |
| Browser and version | Google Chrome 150.0.7871.182, official 64-bit build |
| Device and OS | Windows desktop; OS version not recorded |
| Country | United States |
| Connection | Wired Ethernet |
| Network provider, if permitted | Not recorded |
| Sign-in elapsed time | 2.54 seconds |
| Worker status | HTTP 200 |
| Refresh restore elapsed time | Pass; elapsed time not recorded |
| Close/reopen restore elapsed time | Pass; elapsed time not recorded |
| Logout elapsed time | 0.71 seconds |
| Signed out after refresh | Yes |
| Signed out after close/reopen | Yes |
| Email delivery elapsed time, if applicable | Not applicable |
| Inbox/spam result, if applicable | Not applicable |
| Retry count | 0 |
| Unexpected behavior | None |
| Result | Pass |

### Clerk US conclusion

Result: **Pass**

Three consecutive runs completed without a retry. Google and passwordless email
both completed the full sign-in, Worker HTTP 200, refresh restore, close/reopen
restore, logout, and persistent signed-out sequence. The Clerk development email
arrived in the inbox during the measured passwordless run.

## Philippines execution prerequisites

Localhost on the operator's US computer is not valid Philippine evidence. Before
AUTH-16 can run:

1. identify a trusted tester physically located in the Philippines;
2. create a disposable HTTPS preview for each spike with no production
   credentials or application data;
3. add only those exact preview callback/logout origins to the development
   provider applications;
4. confirm the preview never displays, logs, or persists a complete token;
5. send the tester the preview URL and this runbook through a private channel;
6. delete the preview and remove its provider callback origins after evidence
   is captured.

Creating the preview is intentionally deferred until a tester and test window
exist, avoiding an unnecessary public authentication surface.
