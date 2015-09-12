# Commands

All commands require a '.' before them

 -help *outputs help message*

 -startrace game *creates new race/room, only usable in main channel*

 -join/unjoin *join and unjoin a room, only usable in a race room*

 -done *announce that you've completed a race, only usable in a race room*

 -races *prints all current races*

 -start *when all players are ready the bot will countdown from 10 and then start the race*

 -stop *only OPs/room owners can use it, completely stops a race, only usable in a race room, automatically fired when all players are done*

 -ready *only works once you have `.join`ed, readies up. The race can only start when all players are ready*

 -unready *removes you from the ready queue; the race cannot start*

 -setgoal goal *sets the race goal, only the owner can use this in a race room*

 -goal *prints the goal, only usable in a race room (also shows up in .races)*

 -owner *prints the races owner (who created it)*

 -entrants/racers *prints the people who have `.join`ed the race, also includes their `.comment` and time*

 -reset *only usable by OPs and the race owner; removes all players from the race (does not kick them), resets the startTime, etc. Good for rematches*

 -ops *prints out OPs located in `private/ops.txt`*

 -forfeit *removes a user from a race in progress*

 -forcestart *starts a race even if not all players are ready; usable by OPs and the game owner*

 -comment comment *racers can add a comment to their run, shows up in .racers/.entrants and is saved to records*

 -kick user *removes a user from a race; does not kick them from the channel. Only usable by OPs and the race owner*
