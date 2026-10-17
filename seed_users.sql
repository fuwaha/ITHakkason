-- users テーブルのテスト用データ（schema.sql を実行した後に流す）
-- ※ デモ用のため password は平文。実運用ではハッシュ化した値を入れること
INSERT INTO users (name, email, password, role) VALUES
  ('管理者', 'admin@example.jp', 'demo1234', 'admin'),
  ('山本 マネージャー', 'manager@example.jp', 'manager1234', 'manager'),
  ('中村 ユーザー', 'user@example.jp', 'user1234', 'user');
  ('不破 ユーザー', 'fuwa@iclaude.com', 'fuwa0405', 'user');
  ('稲村 ユーザー', 'inamura@Jmail.com', 'inamura0104', 'user');
  ('宮下 ユーザー', 'miyashita@decomo.com', 'miyashita0427', 'user');


