-- Hadiah mingguan: juara 1 = 7, juara 2 = 5, juara 3 = 3 hari premium.

alter table marathon_events
  alter column weekly_days set default '{7,5,3}';

update marathon_events
   set weekly_days = array[7, 5, 3]
 where is_active;
