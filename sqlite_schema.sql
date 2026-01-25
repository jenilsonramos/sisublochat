-- SQLite Schema

-- Table: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: instances
CREATE TABLE IF NOT EXISTS instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  instance_id TEXT,
  token TEXT,
  status TEXT DEFAULT 'disconnected',
  owner_jid TEXT,
  profile_name TEXT,
  profile_picture_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- Table: chatbots
CREATE TABLE IF NOT EXISTS chatbots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  match_type TEXT DEFAULT 'exact',
  is_greeting BOOLEAN DEFAULT 0,
  cooldown_hours INTEGER DEFAULT 24,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- Table: chatbot_steps
CREATE TABLE IF NOT EXISTS chatbot_steps (
  id TEXT PRIMARY KEY,
  chatbot_id TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  delay INTEGER DEFAULT 1,
  media_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chatbot_id) REFERENCES chatbots (id) ON DELETE CASCADE
);

-- Table: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  remote_jid TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'open',
  is_blocked BOOLEAN DEFAULT 0,
  last_greeted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  from_me BOOLEAN NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  pushed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
);

-- Table: contacts
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  remote_jid TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: flows
CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes TEXT DEFAULT '[]',
  edges TEXT DEFAULT '[]',
  status TEXT DEFAULT 'DRAFT',
  instance_id TEXT,
  trigger_type TEXT DEFAULT 'any',
  trigger_keyword TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
