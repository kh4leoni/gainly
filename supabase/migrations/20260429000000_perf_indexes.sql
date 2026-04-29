-- Performance indexes for query optimization
-- Eliminates sequential scans on high-traffic query paths

create index if not exists idx_sw_client_status
  on scheduled_workouts(client_id, status);

create index if not exists idx_sw_client_status_completed_at
  on scheduled_workouts(client_id, status, completed_at desc);

create index if not exists idx_wl_client_logged_at
  on workout_logs(client_id, logged_at desc);

create index if not exists idx_sl_workout_log_id
  on set_logs(workout_log_id);

create index if not exists idx_pr_client_achieved_at
  on personal_records(client_id, achieved_at desc);

create index if not exists idx_programs_client_created
  on programs(client_id, is_template, created_at desc);
