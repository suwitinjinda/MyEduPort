-- Phase 24: Admission Resources becomes a blog managed from Admin → Blog.
-- body_html is sanitised on save (routes/blog.js) before it is stored.

CREATE TABLE IF NOT EXISTS blog_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('articles','university','scholarship','practice-tests','ebooks') NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  excerpt VARCHAR(400) NULL,
  cover_image VARCHAR(500) NULL,
  body_html MEDIUMTEXT NOT NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_blog_list (status, category, published_at)
);
