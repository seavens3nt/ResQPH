# ResQPH risk register

**Status:** Active
**Owner:** Ranee
**Last updated:** 2026-09-29

| ID | Risk | Likelihood | Impact | Response | Current owner | Trigger or latest decision time |
|---|---|---|---|---|---|---|
| R-001 | The project-defined U-Belt boundary is mistaken for an official district or expanded without review. | Low | High | Use `ubelt-pilot-v1`, display the disclaimer, test boundary validation, and require a decision-log update for changes. | Matthew; Ranee approves changes | Before accepting boundary-dependent work |
| R-002 | Flood-hazard layer cannot be downloaded, redistributed, or joined to roads. | Medium | High | Verify metadata and restrictions; retain controlled scenario fixture as fallback. | Matthew; Ranee decides fallback | Before dataset approval |
| R-003 | Elevation resolution is too coarse for road-level conclusions. | High | Medium | Treat elevation as contextual or remove it from edge-level scoring; document limitation. | Ranee with data/ML reviewer | Before feature approval |
| R-004 | Frontend mock fields diverge from the approved API contract. | High | High | Make the reviewed API/schema files authoritative and plan one explicit migration. | Ranee | Before Phase 2 frontend integration |
| R-005 | ML labels are insufficient or leak location/time information. | High | High | Treat the current random-row Ondoy result as exploratory; require a new spatial/temporal split, pre-outcome feature audit, baseline comparison, and error analysis before runtime acceptance. | Matthew; Ranee reviews | Before any new training or accuracy claim |
| R-006 | ML becomes a hidden dependency of routing. | Low | High | Runtime defaults to disabled; checksum/schema/model failures return a tested deterministic fallback. | Ranee | Before routing integration |
| R-007 | Role simulation is mistaken for secure authentication. | Medium | Medium | Display and document that it is an academic workflow control with no production identity assurance. | Ranee and frontend owners | Before accepting affected UI/API work |
| R-008 | Offline update conflicts with a newer server state. | High | Medium | Queue one versioned event, validate on reconnect, show visible sync failure. | Ranee | Before offline implementation |
| R-009 | Mixed Marikina and Manila fixtures undermine the scope. | High | Medium | Inventory and replace conflicting runtime fixtures before final integration. | Ranee with frontend reviewer | Before Team Phase 1 demo |
| R-010 | Four-week schedule is consumed by polishing UI instead of integration. | Medium | High | Freeze nonessential UI work until the core lifecycle and contracts pass. | Ranee | Weekly gate review |
| R-011 | The system is presented as operational emergency technology. | Low | Critical | Maintain disclaimers, synthetic data, source/time labels, and no safety guarantees. | Ranee | Every review and presentation |
| R-012 | Matthew becomes a capacity bottleneck across geospatial, routing, and AI/ML work. | High | High | Sequence Team Phases 1–3, keep Jared on integration, keep UI owners within frontend boundaries, and reduce optional ML scope before adding parallel work. | Ranee | Before opening each Matthew-owned work package |
| R-013 | A serialized model is loaded with the wrong feature meanings or from an untrusted change. | Low | Critical | Require explicit enablement, SHA-256, reviewed metadata, exact target and ordered features, isolated dependencies, and fallback before deserialization. | Ranee and Jared | Every model-integration review |
