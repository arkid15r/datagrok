--name: PackagesUsage
--input: string date {pattern: datetime}
--input: list groups
--input: list packages
--meta.cache: true
--connection: System:Datagrok
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
res AS (
select pp.name as package, u.friendly_name as user,
e.event_time as time_old, u.id as uid, u.group_id as ugid
from events e
inner join event_types et on e.event_type_id = et.id
inner join entities en on et.id = en.id
inner join published_packages pp on en.package_id = pp.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)
union all
select pp.name as package, u.friendly_name as user,
e.event_time as time_old, u.id as uid, u.group_id as ugid
from events e
inner join event_parameter_values epv inner join event_parameters ep
on epv.parameter_id = ep.id and ep.name = 'package' on epv.event_id = e.id
inner join published_packages pp on pp.id::text = epv.value
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)),
t1 AS (
  SELECT (MAX(res.time_old) - MIN(res.time_old)) as inter
  FROM res
),
t2 AS (
  SELECT case when inter >= INTERVAL '6 month' then 864000
  when inter >= INTERVAL '70 day' then 432000
	when inter >= INTERVAL '10 day' then 86400
	when inter >= INTERVAL '2 day' then 21600
	when inter >= INTERVAL '3 hour' then 3600
	else 600 end as trunc
from t1
)
select res.package, res.user, count(*) AS count,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' as time_start,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' + trunc * interval '1 sec' as time_end,
res.uid, res.ugid
from res, t2, selected_groups sg
where res.ugid = sg.id
and (res.package = any(@packages) or @packages = ARRAY['all'])
GROUP BY res.package, res.user, time_start, time_end, res.uid, res.ugid
--end


--name: PackagesContextPaneFunctions
--input: int time_start
--input: int time_end
--input: string user
--input: string package
--meta.cache: true
--connection: System:Datagrok
select pp.name as package, en.id, et.name, count(*)
from events e
inner join event_types et on e.event_type_id = et.id
inner join entities en on et.id = en.id
inner join published_packages pp on en.package_id = pp.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where e.event_time between to_timestamp(@time_start)
and to_timestamp(@time_end)
and u.id = @user
and pp.name = @package
group by en.id, et.name, pp.name
--end


--name: PackagesContextPaneLogs
--input: int time_start
--input: int time_end
--input: string user
--input: string package
--meta.cache: true
--connection: System:Datagrok
select et.source, count(*)
from events e
inner join event_types et on e.event_type_id = et.id
inner join event_parameter_values epv inner join event_parameters ep
on epv.parameter_id = ep.id and ep.name = 'package' on epv.event_id = e.id
inner join published_packages pp on pp.id::text = epv.value
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where e.event_time between to_timestamp(@time_start)
and to_timestamp(@time_end)
and u.id = @user
and pp.name = @package
group by et.source
--end
