create table if not exists storage (
    id bigint primary key,
    short_code text unique not null,
    original text not null
);

create sequence if not exists id_sequence start 1000000 increment 1;

alter table storage alter column id set default nextval('id_sequence');

alter sequence id_sequence owned by storage.id;