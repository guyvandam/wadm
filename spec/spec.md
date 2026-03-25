# wadm application
Weight Average Decision Matrix - a decision making tool in which u lay out your options, you criteria, and weight for each criteria and the score for each option for each criterion!

# features
1. list of decisions wadms

# wadm object
## attributes
1. date
2. name (title)
3. notes (free writing [in markdown])
4. wadm itself


# wadm criteria
each has
1. name
2. weight
3. note (not on why that score is given)

# option score per criterion
1. score
    - score is numeric. from 1-10 with 0.5 increments.
2. note (note on why the score is given)


# data
- each wadm is saved as a json for easy readability and transferability!
- the json file name is the date of decision followed by its title. all in lower case. with dash separators. e.g. - `2025-12-02-what-car-should-i-buy.json`
- code logic handles edge case of a wadm file being deleted outside the UI (e.g. json file deleted manually by user)
- data folder is called `storage`
- `storage` folder resides in the icloud folder of the mac. under `wadm` folder.

# general functionality
- a make-sure prompt will be displayed on all deletion of criterion or options. 
    - the code will use a best practice wrapper to avoid duplicate logic

# macos app
1. the final .app file will reside in the *applications* folder
2. app will quit on `cmd + Q`, close window on `cmd + W` and adhere to all regular macos keyboard shortcuts for navigation.
3. app name is WADM.app
