# AMR PRD Word template contract

## Reference

- Reference: `C:\Users\Kai\Documents\ChatGPT\AMR\AMR_V2\Doc\PRD\AMR V1.0.0需求文档.docx`
- SHA-256: `2ED1AA271517A2028A1D9D3B7B88C781FAF79481C07E87B5E5E8DA632AE5A1FD`
- Sections: 1; orientation: portrait; page size: A4 (8.27 × 11.69 in).
- Evidence: `.tmp/prd-word/reference-style.json`; section audit output captured in the task log.
- Render status: the packaged renderer could not locate LibreOffice during initial distillation. Final rendering must be retried after authoring; if unavailable, structural audits are the fallback gate.

## Page system

- Margins: left/right 0.55 in, top 0.75 in, bottom 0.65 in.
- Header/footer distance: 0.28 in. No different first page and no odd/even variants.
- Single continuous portrait section; add page breaks only for the cover and major readability needs.
- Footer: document title, middle separator and a PAGE field aligned consistently with the reference.

## Typography

- Typeface: Noto Sans CJK SC for all CJK and Latin text.
- Normal: 10 pt, `#15202B`, 1.3 line spacing, 5 pt after.
- Title role: 24 pt bold, `#15202B`, 6 pt after.
- Subtitle: 12 pt regular, `#667789`, 5 pt after.
- Heading 1: 18 pt bold, `#15202B`, 12 pt before / 8 pt after, keep with next.
- Heading 2: 15 pt bold, `#0C5DCC`, 10 pt before / 6 pt after, keep with next.
- Heading 3: 12 pt bold, `#15202B`, 8 pt before / 5 pt after, keep with next.
- Heading 4: 10.5 pt bold, `#0C5DCC`, 7 pt before / 3 pt after, keep with next.
- Caption: 9 pt, `#667789`, centered, 2 pt before / 7 pt after.

## Lists and tables

- Use real Word list numbering and bullet definitions; wrapped lines use hanging indents.
- Tables align with body text, use explicit fixed widths based on the 7.17 in usable page width, repeat header rows, and never use fixed row heights.
- Header cells use dark blue fill with white bold text; body rows alternate white and very light blue-gray where the reference does so.
- Cell margins remain generous enough for 9–10 pt content; descriptive columns receive the largest width.

## Components and content flow

- Cover: AMR brand label, document title, subtitle, language note and metadata table.
- Front matter: file information, revision history and scope table.
- Main body: numbered Heading 1 modules, Heading 2 page/feature groups, Heading 3 feature requirements, followed by a compact requirement metadata table, prose, numbered rules, field tables and screenshots.
- Screenshots: use the existing `Doc/screenshots` assets, centered within usable width, followed by a caption.
- Requirement metadata tables use the repeated fields: user scenario, functional description, input/precondition, output/postcondition and supplemental notes.
- Closing sections: implementation-wide rules, non-functional requirements, acceptance criteria and references.

## Slot map

- Rewrite: cover subtitle, file information, revision history, scope table and all main-body content from the expanded Markdown source.
- Preserve pattern: cover hierarchy, heading ladder, metadata tables, screenshots/captions, footer and restrained blue palette.
- Remove: obsolete claims about unassigned tasks, manual cancellation, current-stage columns and real-time cumulative-duration display.
- Add: complete behavior tree, resource management, map management, system settings, data contracts, state transitions, abnormal handling, permissions, performance and acceptance content.

## Package preservation and fidelity gates

- Preserve the reference path byte-for-byte; final output uses a different filename.
- Reuse reference styles and theme semantics. The new document may have different pagination and package parts because it is a comprehensive rewrite.
- Gate: no clipped tables/images, no orphan headings, no missing glyphs, repeated table headers, valid heading hierarchy, functional page footer and complete source coverage.
