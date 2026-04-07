create extension if not exists pgcrypto;

create table if not exists products (
  productid bigint generated always as identity primary key,
  productname text not null,
  unit text not null,
  costprice numeric(12,2) not null default 0,
  category text not null
);

create table if not exists branches (
  branchid bigint generated always as identity primary key,
  branchname text not null unique,
  deliverydays text
);

create table if not exists orders (
  orderid uuid primary key default gen_random_uuid(),
  orderdate timestamptz not null default now(),
  branchid bigint not null references branches(branchid) on delete restrict,
  productid bigint not null references products(productid) on delete restrict,
  quantity numeric(12,3) not null check (quantity >= 0),
  status text not null default 'Pending'
);

create index if not exists idx_orders_date on orders(orderdate);
create index if not exists idx_orders_product on orders(productid);
create index if not exists idx_orders_branch on orders(branchid);
