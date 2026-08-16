-- One-off: apply the new 우수/프로 badge thresholds to gyms that were
-- already seeded before this change (new signups get them automatically
-- from DEFAULT_EVENTS). Safe to run anytime -- only touches benchmark
-- columns on the 6 default events, not custom events or any records.
update events set benchmark_good = 80,  benchmark_pro = 95  where key = '30s_alternate' and is_custom = false;
update events set benchmark_good = 75,  benchmark_pro = 90  where key = '30s_double'    and is_custom = false;
update events set benchmark_good = 110, benchmark_pro = 140 where key = '30s_basic'     and is_custom = false;
update events set benchmark_good = 26,  benchmark_pro = 31  where key = '10s_alternate' and is_custom = false;
update events set benchmark_good = 25,  benchmark_pro = 30  where key = '10s_double'    and is_custom = false;
update events set benchmark_good = 36,  benchmark_pro = 46  where key = '10s_basic'     and is_custom = false;
