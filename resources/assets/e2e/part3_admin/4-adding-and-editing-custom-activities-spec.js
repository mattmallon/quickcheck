var browser3 = browser.params.browser3, //define browser instance from global value
    includes = require('../common/includes.js'),
    data = includes.data,
    viewSetsPage = new includes.ViewSetsPage(browser3);

describe('Adding custom activities', function() {
    var custom = viewSetsPage.customActivities, //for easier typing
        customData = data.customActivity;

    it('should show the proper form when the custom activities button is clicked', async function() {
        await custom.open();
        expect(await custom.isOpen()).toBe(true);
    });

    it('should hide the form when the close button is clicked', async function() {
        await custom.close();
        expect(await custom.isOpen()).toBe(false);
    })

    it('should initially show a message saying no custom activities have been added yet', async function() {
        await custom.open();
        expect(await custom.areNoneCreated()).toBe(true);
    });

    it('should show the proper form when the add custom button is clicked', async function() {
        await custom.addActivity();
        expect(await custom.getNewNameInput().isDisplayed()).toBe(true);
    });

    it('should throw a validation error when the url is not included', async function() {
        await custom.getNewNameInput().sendKeys(customData.name);
        await custom.submitNew();
        expect(await custom.getSuccessMsg().isPresent()).toBe(false);
    });

    it('should add the newly added custom activity to the list', async function() {
        await custom.getNewUrlInput().sendKeys(customData.url);
        await custom.getNewDescriptionInput().sendKeys(customData.description);
        await custom.getNewDevInput().sendKeys(customData.dev);
        await custom.submitNew();
        expect(await custom.areNoneCreated()).toBe(false);
        expect(await custom.getActivities().count()).toBe(1);
        expect(await custom.getActivities().get(0).getText()).toContain(customData.name);
    });
});

describe('Editing custom activities', function() {
    var custom = viewSetsPage.customActivities, //for easier typing
        customData = data.customActivity,
        activity = custom.getActivities().get(0);

    it('should show the correct name when edited', async function() {
        await custom.editActivity(activity);
        expect(await custom.getEditedNameInput(activity).getAttribute('value')).toBe(customData.name);
    });

    it('should show the correct description when edited', async function() {
        expect(await custom.getEditedDescriptionInput(activity).getAttribute('value')).toBe(customData.description);
    });

    it('should show the correct url when edited', async function() {
        expect(await custom.getEditedUrlInput(activity).getAttribute('value')).toBe(customData.url);
    });

    it('should show the correct developer when edited', async function() {
        expect(await custom.getEditedDevInput(activity).getAttribute('value')).toBe(customData.dev);
    });

    it('should correctly show group required when edited', async function() {
        expect(await custom.getEditedGroupRequired(activity).getAttribute('checked')).toBeFalsy();
    });


    it('should show the edited name after saving edits', async function() {
        //change all fields (update info from the data file as well so it's current)
        customData.name = customData.name + ' edited';
        customData.description = customData.description + ' edited';
        customData.url = 'psych101/C1-4/activities/brain/brain.html';
        customData.dev = customData.dev + ' edited';

        await custom.getEditedNameInput(activity).clear().sendKeys(customData.name);
        await custom.getEditedDescriptionInput(activity).clear().sendKeys(customData.description);
        await custom.getEditedUrlInput(activity).clear().sendKeys(customData.url);
        await custom.getEditedDevInput(activity).clear().sendKeys(customData.dev);
        await custom.getEditedGroupRequired(activity).click();
        await custom.submitEdited(activity);

        //M. Mallon, 11/7/19, intermittent errors here with button not being clicked, try a second time if needed
        const name = await custom.getName(activity);
        if (name != customData.name.toUpperCase()) {
            await custom.submitEdited(activity);
        }

        expect(await custom.getName(activity)).toBe(customData.name.toUpperCase());
    });

    it('should show the edited description after saving edits', async function() {
        expect(await custom.getDescription(activity)).toContain(customData.description);
    });

    it('should show the edited url after saving edits', async function() {
        expect(await custom.getUrl(activity)).toContain(customData.url);
    });

    it('should show the edited developer after saving edits', async function() {
        expect(await custom.getDev(activity)).toContain(customData.dev);
    });

    it('should show that group is required after saving edits', async function() {
        expect(await custom.isGroupRequired(activity)).toBe(true);
    });
});

describe('Deleting custom activities', function() {
    var custom = viewSetsPage.customActivities; //for easier typing

    it('should remove the custom activity from the list after being deleted', async function() {
        //add a new one to throw away
        await custom.addActivity();
        await custom.getNewNameInput().sendKeys('Whatever');
        await custom.getNewDescriptionInput().sendKeys('Whatever');
        await custom.getNewUrlInput().sendKeys('https://google.com');
        await custom.getNewDevInput().sendKeys('Man of mystery');
        await custom.submitNew();

        await custom.deleteActivity(custom.getActivities().get(1));
        expect(await custom.getActivities().count()).toBe(1);
    });
});