-- Database schema based on the provided table design
-- MySQL / MariaDB compatible SQL

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE tools (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    provider_name VARCHAR(255) NULL,
    category VARCHAR(100) NULL,
    description TEXT NULL,
    admin_url VARCHAR(500) NULL,
    official_url VARCHAR(500) NULL,
    status ENUM('active', 'inactive', 'pending', 'suspended') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE license_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tool_id BIGINT UNSIGNED NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    renewal_date DATE NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    billing_type ENUM('monthly', 'yearly', 'one-time', 'custom') NOT NULL DEFAULT 'monthly',
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('active', 'expired', 'pending', 'cancelled') NOT NULL DEFAULT 'active',
    contract_number VARCHAR(100) NULL,
    notes TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_license_plans_tool FOREIGN KEY (tool_id)
        REFERENCES tools (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_license_plans_tool_id (tool_id),
    INDEX idx_license_plans_status (status)
);

CREATE TABLE members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    member_number VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(255) NULL,
    status ENUM('active', 'inactive', 'on_leave', 'suspended') NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE license_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    license_plan_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_by BIGINT UNSIGNED NULL,
    released_at DATETIME NULL,
    status ENUM('assigned', 'released', 'expired', 'cancelled') NOT NULL DEFAULT 'assigned',
    release_reason TEXT NULL,
    notes TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_license_assignments_plan FOREIGN KEY (license_plan_id)
        REFERENCES license_plans (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_license_assignments_member FOREIGN KEY (member_id)
        REFERENCES members (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_license_assignments_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_license_assignments_released_by FOREIGN KEY (released_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_license_assignments_plan_id (license_plan_id),
    INDEX idx_license_assignments_member_id (member_id),
    INDEX idx_license_assignments_status (status)
);

CREATE TABLE operation_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id BIGINT UNSIGNED NULL,
    before_data JSON NULL,
    after_data JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_operation_logs_user FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_operation_logs_user_id (user_id),
    INDEX idx_operation_logs_created_at (created_at)
);

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read)
);
