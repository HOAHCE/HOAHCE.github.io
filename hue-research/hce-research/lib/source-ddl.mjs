// Bảng dữ liệu nguồn nhập từ CSDL Khoa học Đại học Huế (csdlkhoahoc.hueuni.edu.vn).
// Dùng chung cho ứng dụng (lib/db.ts) và bộ đồng bộ (scripts/sync-hueuni.mjs).
export const SOURCE_DDL = `
  CREATE TABLE IF NOT EXISTS src_article (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    venue TEXT,
    year INTEGER,
    issn TEXT,
    field TEXT,
    category TEXT,
    authors TEXT NOT NULL DEFAULT '[]',
    has_file INTEGER NOT NULL DEFAULT 0,
    search TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_src_article_year ON src_article(year);
  CREATE TABLE IF NOT EXISTS src_topic (
    id INTEGER PRIMARY KEY,
    code TEXT,
    title TEXT NOT NULL,
    field TEXT,
    lead_unit TEXT,
    perform_unit TEXT,
    members TEXT NOT NULL DEFAULT '[]',
    search TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS src_scientist (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    degree TEXT,
    major TEXT,
    specialty TEXT,
    unit TEXT,
    search TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS src_form (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    section TEXT NOT NULL,
    subsection TEXT,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    download_url TEXT,
    is_document INTEGER NOT NULL DEFAULT 0,
    search TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS src_eu_call (
    id TEXT PRIMARY KEY,
    type INTEGER NOT NULL,
    identifier TEXT NOT NULL,
    call_id TEXT,
    call_title TEXT,
    title TEXT NOT NULL,
    programme TEXT,
    programme_abbr TEXT,
    action_type TEXT,
    deadline_model TEXT,
    opens_on TEXT,
    deadlines TEXT NOT NULL DEFAULT '[]',
    budget_eur REAL,
    description TEXT,
    portal_url TEXT NOT NULL,
    submission_url TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    search TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    title_key TEXT NOT NULL,
    publisher TEXT,
    country TEXT,
    issns TEXT NOT NULL DEFAULT '[]',
    homepage TEXT,
    sjr_year INTEGER,
    sjr REAL,
    sjr_quartile TEXT,
    sjr_h_index INTEGER,
    sjr_categories TEXT,
    sjr_areas TEXT,
    sjr_sourceid TEXT,
    sjr_type TEXT,
    sjr_open_access INTEGER,
    vn2244 INTEGER NOT NULL DEFAULT 0,
    vn2244_group TEXT,
    vn2244_no INTEGER,
    vn2244_agency TEXT,
    vn2244_alt TEXT,
    doaj INTEGER NOT NULL DEFAULT 0,
    doaj_url TEXT,
    doaj_license TEXT,
    doaj_apc TEXT,
    search TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_title_key ON journal(title_key);
  CREATE INDEX IF NOT EXISTS idx_journal_sjr ON journal(sjr);
  CREATE TABLE IF NOT EXISTS journal_issn (
    issn TEXT PRIMARY KEY,
    journal_id INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_journal_issn_jid ON journal_issn(journal_id);
  CREATE TABLE IF NOT EXISTS journal_source (
    source TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    version TEXT,
    source_url TEXT,
    license_note TEXT,
    note TEXT,
    record_count INTEGER,
    imported_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL,
    counts TEXT,
    note TEXT
  );
`;
