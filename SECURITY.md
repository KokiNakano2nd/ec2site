# Security Policy

## Supported versions

This repository is under active development. Only the latest commit on `main` is supported.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential. Use the repository's **Security** tab and select **Report a vulnerability** to create a private security advisory.

Include the affected component, impact, reproduction steps or proof of concept, and any suggested mitigation. Do not include real customer data, active credentials, access tokens, or destructive test results.

The initial response target is defined in [the CI/CD and DevSecOps design](docs/deliverables/architecture/05_cicd_devsecops_tobe.md#62-脆弱性対応sla初期案). A leaked credential or actively exploited issue is handled immediately rather than waiting for the normal target.

## Disclosure

Please allow time to confirm the issue, prepare a fix, rotate credentials if needed, and coordinate disclosure. Acknowledgement and publication timing will be agreed with the reporter after impact is understood.
