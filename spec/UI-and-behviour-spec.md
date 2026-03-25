# wadm view
- date is editable with a date picker. the date picker is initialized on today's date.
- notes about the decision is in markdown below the decision table. with ample horizontal spacing from the corners.
- in the upper right view a saved animation is viewed every time a change is made to infer the user the data has been saved.
- the left side of each criterion the user can select an icon for it. uses Lucide React icons.

## initial empty wadm view
an initial empty wadm view start with a table that has 2 rows and 2 columns. seen in [example-excel.png], the user can then add more criterions and options by pressing the plus buttons

## table
### criterion view
- each criterion should have a separate color. the color should stretch out only until the first column - e.i. the width of the first column of the criteria column.
- color can be picked from selection by user. 
- color picker is the same as the icon picker. - a unified picker for both color and icon, for a clean and compact aesthetic.
    - dark mode - when in dark mode, the text is opposite to the color component it resides in. The logic resided in the 
- notes are displayed as smaller text below the title of the criterion. italic font. when pressed will show up the dialog for editing.
- icon will appear inline with the title and notes below both title and text. to preserve horizontal spacing.

### options row
- options row will be elevated one row above the row of 
- similar to criterions, each options will have an icon and color. selected in the same manner as criterion with the same UI components


### score view
- notes are displayed as smaller text below the score for the criterion for each option. With the same ui component and design of the notes of the criteria.

### deletion button
- in order to save space and have a minimalist compact design and save horizontal spacing, the trash button will appear on the left side of either option or criteria when hover above that area. it'll appear and cover the existing text / icon existing there from the left.
    - this behavior is for both option and criteria view. and will use the same component.
- the deletion button will appear in the upper left corner as to not interfere with icon and color picker button.

# general UI requirements
1. use Shadcn ui components
2. have toolkit on hover for all buttons

# other
1. dark mode support. from shadcn.