# MCP Tool Definition Validator - Official Server Test Results

Generated: 2026-01-08T03:33:29.660Z

## Summary

| Metric | Value |
|--------|-------|
| Servers Tested | 4 |
| Successful | 4 |
| Failed | 0 |
| Total Tools | 35 |
| Total Errors | 99 |
| Total Warnings | 55 |
| Total Suggestions | 143 |

## Per-Server Results

### filesystem

**Description:** Secure file operations with configurable access controls

| Metric | Value |
|--------|-------|
| Status | ✅ Success |
| Tools | 14 |
| Valid | No |
| Errors | 63 |
| Warnings | 15 |
| Suggestions | 38 |

**Tools:**
- ❌ `read_file`
- ❌ `read_text_file`
- ❌ `read_media_file`
- ❌ `read_multiple_files`
- ❌ `write_file`
- ❌ `edit_file`
- ❌ `create_directory`
- ❌ `list_directory`
- ❌ `list_directory_with_sizes`
- ❌ `directory_tree`
- ❌ `move_file`
- ❌ `search_files`
- ❌ `get_file_info`
- ❌ `list_allowed_directories`

**Issues by Rule:**
- `BP-001`: 14 occurrence(s)
- `BP-004`: 10 occurrence(s)
- `BP-008`: 2 occurrence(s)
- `LLM-004`: 3 occurrence(s)
- `LLM-005`: 8 occurrence(s)
- `LLM-006`: 18 occurrence(s)
- `LLM-008`: 1 occurrence(s)
- `LLM-009`: 1 occurrence(s)
- `LLM-011`: 3 occurrence(s)
- `LLM-012`: 4 occurrence(s)
- `NAM-002`: 14 occurrence(s)
- `NAM-005`: 2 occurrence(s)
- `SCH-006`: 1 occurrence(s)
- `SEC-001`: 16 occurrence(s)
- `SEC-002`: 4 occurrence(s)
- `SEC-003`: 4 occurrence(s)
- `SEC-004`: 11 occurrence(s)

### memory

**Description:** Knowledge graph-based persistent memory system

| Metric | Value |
|--------|-------|
| Status | ✅ Success |
| Tools | 9 |
| Valid | No |
| Errors | 21 |
| Warnings | 11 |
| Suggestions | 49 |

**Tools:**
- ❌ `create_entities`
- ❌ `create_relations`
- ❌ `add_observations`
- ❌ `delete_entities`
- ❌ `delete_observations`
- ❌ `delete_relations`
- ❌ `read_graph`
- ❌ `search_nodes`
- ❌ `open_nodes`

**Issues by Rule:**
- `BP-001`: 9 occurrence(s)
- `BP-002`: 9 occurrence(s)
- `BP-003`: 6 occurrence(s)
- `BP-004`: 9 occurrence(s)
- `BP-008`: 7 occurrence(s)
- `LLM-004`: 7 occurrence(s)
- `LLM-005`: 9 occurrence(s)
- `LLM-006`: 4 occurrence(s)
- `NAM-002`: 9 occurrence(s)
- `NAM-005`: 1 occurrence(s)
- `SCH-006`: 1 occurrence(s)
- `SEC-001`: 1 occurrence(s)
- `SEC-002`: 7 occurrence(s)
- `SEC-006`: 1 occurrence(s)
- `SEC-010`: 1 occurrence(s)

### everything

**Description:** Reference/test server with multiple tool types

| Metric | Value |
|--------|-------|
| Status | ✅ Success |
| Tools | 11 |
| Valid | No |
| Errors | 13 |
| Warnings | 27 |
| Suggestions | 49 |

**Tools:**
- ❌ `echo`
- ✅ `add`
- ❌ `longRunningOperation`
- ❌ `printEnv`
- ❌ `sampleLLM`
- ❌ `getTinyImage`
- ❌ `annotatedMessage`
- ❌ `getResourceReference`
- ❌ `getResourceLinks`
- ❌ `structuredContent`
- ✅ `zip`

**Issues by Rule:**
- `BP-001`: 11 occurrence(s)
- `BP-002`: 11 occurrence(s)
- `BP-003`: 1 occurrence(s)
- `BP-004`: 11 occurrence(s)
- `BP-008`: 1 occurrence(s)
- `LLM-002`: 1 occurrence(s)
- `LLM-003`: 2 occurrence(s)
- `LLM-004`: 6 occurrence(s)
- `LLM-005`: 10 occurrence(s)
- `LLM-009`: 4 occurrence(s)
- `LLM-012`: 1 occurrence(s)
- `NAM-002`: 8 occurrence(s)
- `NAM-005`: 7 occurrence(s)
- `SCH-006`: 2 occurrence(s)
- `SCH-007`: 2 occurrence(s)
- `SEC-001`: 4 occurrence(s)
- `SEC-003`: 5 occurrence(s)
- `SEC-007`: 1 occurrence(s)
- `SEC-008`: 1 occurrence(s)

### sequential-thinking

**Description:** Dynamic and reflective problem-solving through thought sequences

| Metric | Value |
|--------|-------|
| Status | ✅ Success |
| Tools | 1 |
| Valid | No |
| Errors | 2 |
| Warnings | 2 |
| Suggestions | 7 |

**Tools:**
- ❌ `sequentialthinking`

**Issues by Rule:**
- `BP-001`: 1 occurrence(s)
- `BP-002`: 1 occurrence(s)
- `BP-004`: 1 occurrence(s)
- `LLM-002`: 1 occurrence(s)
- `LLM-009`: 4 occurrence(s)
- `NAM-005`: 1 occurrence(s)
- `SEC-001`: 2 occurrence(s)

## Common Issues Across Servers

| Rule | Occurrences | Servers |
|------|-------------|--------|
| `SEC-001` | 4 | filesystem, memory, everything, sequential-thinking |
| `BP-001` | 4 | filesystem, memory, everything, sequential-thinking |
| `BP-004` | 4 | filesystem, memory, everything, sequential-thinking |
| `NAM-005` | 4 | filesystem, memory, everything, sequential-thinking |
| `NAM-002` | 3 | filesystem, memory, everything |
| `LLM-004` | 3 | filesystem, memory, everything |
| `LLM-005` | 3 | filesystem, memory, everything |
| `BP-008` | 3 | filesystem, memory, everything |
| `LLM-009` | 3 | filesystem, everything, sequential-thinking |
| `SCH-006` | 3 | filesystem, memory, everything |
| `BP-002` | 3 | memory, everything, sequential-thinking |
| `SEC-003` | 2 | filesystem, everything |
| `LLM-006` | 2 | filesystem, memory |
| `LLM-012` | 2 | filesystem, everything |
| `SEC-002` | 2 | filesystem, memory |
| `BP-003` | 2 | memory, everything |
| `LLM-002` | 2 | everything, sequential-thinking |
| `SEC-004` | 1 | filesystem |
| `LLM-008` | 1 | filesystem |
| `LLM-011` | 1 | filesystem |
| `SEC-006` | 1 | memory |
| `SEC-010` | 1 | memory |
| `LLM-003` | 1 | everything |
| `SCH-007` | 1 | everything |
| `SEC-007` | 1 | everything |
| `SEC-008` | 1 | everything |
