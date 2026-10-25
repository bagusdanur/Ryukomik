-- Koreksi pembagian hadiah: mingguan jauh lebih kecil dari bulanan.
-- Urutan array: [juara 1, juara 2, juara 3] dalam hari premium.

alter table marathon_events
  alter column weekly_days set default '{7,3,1}',
  alter column monthly_days set default '{30,14,7}';

update marathon_events
   set weekly_days = array[7, 3, 1],
       monthly_days = array[30, 14, 7]
 where is_active;
