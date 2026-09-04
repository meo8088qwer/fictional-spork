-- Swap the ops dashboard operator account: a01099988088@gmail.com ->
-- meo8088@naver.com (the latter already used as SUPPORT_EMAIL in
-- src/components/MyPage.tsx).
delete from public.platform_admins where user_id = 'a83d8e29-269e-415d-9151-aabb15f6cab1';

insert into public.platform_admins (user_id)
values ('4b4982e7-63f8-4cce-bec9-20ea498ba0dc')
on conflict do nothing;
