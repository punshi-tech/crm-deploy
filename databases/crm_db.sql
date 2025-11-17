USE sql7807695;
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE not null,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  fname VARCHAR(255) NOT NULL,
  lname VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) unique NOT null,
   role_id INT NOT null,
  CONSTRAINT chk_email_format CHECK (email LIKE '%_@__%.__%'),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

ALTER TABLE employees
ADD COLUMN refresh_token VARCHAR(512) DEFAULT NULL;

INSERT INTO roles (role_name) VALUES("customer_support");

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY, 
  username VARCHAR(255) UNIQUE NOT NULL,
  PASSWORD VARCHAR(255) NOT NULL,
  fname VARCHAR(255) NOT NULL,
  lname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,  
  phone VARCHAR(20) UNIQUE,                    
  address VARCHAR(255),                        
  refresh_token TEXT,                          
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
);

ALTER TABLE clients 
CHANGE COLUMN phone phone_number VARCHAR(20) UNIQUE;

CREATE TABLE product_categories (id INT AUTO_INCREMENT PRIMARY KEY, category VARCHAR(255) NOT NULL );
INSERT INTO product_categories (category) VALUES ('furniture');
INSERT INTO product_categories (category) VALUES ('accessories');
INSERT INTO product_categories (category) VALUES ('resin_epoxy');
INSERT INTO product_categories (category) VALUES ('tools');

CREATE TABLE products (
id int AUTO_INCREMENT PRIMARY KEY,
product_name VARCHAR(255) NOT NULL,
product_image VARCHAR(255) NOT NULL,
category_id int NOT NULL,
info VARCHAR(255) NOT NULL,
base_price DECIMAL(10,2) NOT NULL,
current_price DECIMAL(10,2), 
price_edited_by INT DEFAULT NULL,
FOREIGN KEY (category_id) REFERENCES product_categories(id),
FOREIGN KEY (price_edited_by) REFERENCES employees(id));

ALTER TABLE products 
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE product_gallery (
id int AUTO_INCREMENT PRIMARY KEY,
product_id int NOT NULL,
image_path VARCHAR(255) NOT NULL,
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE );

CREATE TABLE payment_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  card_number VARCHAR(16) NOT NULL UNIQUE,
  cvv VARCHAR(4) NOT NULL,
  balance DECIMAL(13,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  card_id INT DEFAULT NULL,
  assigned_to INT DEFAULT NULL,
  status ENUM('pending', 'in_progress', 'delivered', 'closed') DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (card_id) REFERENCES payment_cards(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,

  FOREIGN KEY (assigned_to) REFERENCES employees(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);


CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  price_at_purchase DECIMAL(10,2) NOT NULL,
  
  FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);




CREATE TABLE card_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  card_id INT NOT NULL,
  transaction_type ENUM('create', 'topup') NOT NULL,
  amount DECIMAL(13,2) NOT NULL,
  performed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES payment_cards(id)
    ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES employees(id)
);

ALTER TABLE card_transactions 
MODIFY COLUMN transaction_type 
ENUM('create', 'topup', 'purchase') NOT NULL;


ALTER TABLE card_transactions 
ADD COLUMN order_id INT DEFAULT NULL,
ADD CONSTRAINT fk_card_transactions_order
FOREIGN KEY (order_id) REFERENCES orders(id)
ON DELETE CASCADE ;

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fname VARCHAR(255) NOT NULL,
  lname VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  customer_service_employee_id INT,
  status ENUM('open', 'in_progress', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_service_employee_id) REFERENCES employees(id)
);
ALTER TABLE tickets
ADD COLUMN client_id INT;
ALTER TABLE tickets
ADD CONSTRAINT fk_tickets_clients
FOREIGN KEY (client_id) REFERENCES clients(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

INSERT INTO roles (role_name) VALUES("accountant");
INSERT INTO product_categories (category) VALUES ("decoration");