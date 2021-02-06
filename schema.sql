create table users (
    uid serial primary key,
    username varchar(255) unique,
    email varchar(255),
    email_verified boolean,
    date_created date,
    last_login date
);

create table posts (
    pid serial primary key,
    title varchar(255),
    body varchar,
    user_id int references users(uid),
    author varchar references users(username),
    date_created timestamp
);

create table comments (
    cid serial primary key,
    comment varchar(255),
    author varchar references users(username),
    user_id int references users(uid),
    post_id int references posts(pid),
    date_created timestamp
);