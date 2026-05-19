-- 유입 경로별 리드 수
select
  first_touch->>'utm_source' as utm_source,
  first_touch->>'utm_medium' as utm_medium,
  first_touch->>'utm_campaign' as utm_campaign,
  count(*) as leads
from public.leads
group by 1,2,3
order by leads desc;

-- CTA 클릭까지 평균 시간
select
  avg(milliseconds_since_first_visit) / 1000.0 as avg_seconds_to_cta
from public.events
where event_name = 'cta_click';

-- 신청 완료까지 평균 시간
select
  avg(milliseconds_to_submit) / 1000.0 as avg_seconds_to_submit
from public.leads;

-- 섹션별 평균 체류 시간
select
  event_target as section,
  avg((metadata->>'duration_ms')::numeric) / 1000.0 as avg_seconds
from public.events
where event_name = 'section_exit'
  and metadata ? 'duration_ms'
group by event_target
order by avg_seconds desc;

-- 퍼널 카운트
select event_name, count(*)
from public.events
where event_name in ('page_view', 'cta_click', 'lead_form_view', 'purchase_intent', 'lead_submit', 'conversion_complete')
group by event_name
order by count(*) desc;
