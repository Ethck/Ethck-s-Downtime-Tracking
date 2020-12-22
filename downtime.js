const FORM_TEMPLATE = "modules/downtime-ethck/templates/add-downtime-form2.html";

const EDIT_DOWNTIME_TITLE = "Edit a Downtime Activity";
const ADD_DOWNTIME_TITLE = "Add a Downtime Event";

const DND5E_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Dice Set",
  "Disguise Kit",
  "Forgery Kit",
  "Glassblower's Tools",
  "Herbalism Kit",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Musical Instrument(s)",
  "Navigator's Tools",
  "Painter's Supplies",
  "Playing Card Set",
  "Poisoner's Kit",
  "Potter's Tools",
  "Smith's Tools",
  "Thieves' Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

const COMPLETION_CHANCES = [10, 25, 50, 75, 100];

/*
ACTIVITY_TYPES:
  SUCCESS_COUNT
  ROLL_TOTAL
  NO_ROLL

ROLL_TYPES:
  ABILITY_CHECK
  SAVING_THROW
  SKILL_CHECK
  TOOL_CHECK
  CUSTOM
 */

const ACTIVITY_ROLL_MODEL = {
  type : 0, //* ROLL_TYPES
  roll : "",
  group: "",
  dc   : 0,
}

const ACTIVITY_RESULT_MODEL = {
  min    : 0,
  max    : 0,
  details: ""
}

const ACTIVITY_MODEL = {
  name       : "New Downtime Activity",
  description: "",
  chat_icon  : "icons/svg/d20.svg",
  sheet_icon : "icons/svg/d20.svg",
  type       : 0,  //* ACTIVITY_TYPES
  roll      : [], //* ACTIVITY_ROLL_MODEL
  result    : [], //* ACTIVITY_RESULT_MODEL
  complications: {
    chance    : "",
    roll_table: ""
  },
  options: {
    rolls_are_private        : false,
    complications_are_private: false,
    ask_for_materials        : false,
    days_used                : 0,
  }
}

export class DWTForm extends FormApplication {
  constructor(actor = {}, activity = {}, editMode = false, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.actor = actor;
    this.edit = editMode;
    this.image = activity.chat_icon || ""
  }

  static get defaultOptions() {
    let title = this.editing ? EDIT_DOWNTIME_TITLE : ADD_DOWNTIME_TITLE;

    return mergeObject(super.defaultOptions, {
      id           : "downtime-ethck",
      template     : FORM_TEMPLATE,
      title        : title,
      closeOnSubmit: true,
      popOut       : true,
      width        : 800,
      height       : "auto",
    })
  }

  async getData() {
    return {
      abilities: CONFIG.DND5E.abilities,
      saves: CONFIG.DND5E.abilities,
      skills: CONFIG.DND5E.skills,
      tools: DND5E_TOOLS,
      activity: this.activity,
      tables: game.tables,
      compChances: COMPLETION_CHANCES
    };
  }

  render(force, context = {}) {
    // Only re-render if needed
    const { action, data } = context;
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);

    this.element.find(".addRollable").click(() => this.addRollable());
    this.element.find("#rollableEventsTable > li > .result-controls > .delete-roll").click((event) => this.deleteRollable(event));

    this.element.find(".addResult").click(() => this.addResult());
    this.element.find("#resultsTable > li > .result-controls > .delete-result").click((event) => this.deleteResult(event));

    this.element.find("#rollableEventsTable > #rollable > #roll-type > select").change((event) => this.changeValSelect(event));


    this.element.find(".file-picker-cust").click((event) => this.handleImage(event));

    // Not really a listener, but update the state of this.
    // if (this.activity.type === "categories"){
    //     this.element.find("#categoryActivity").attr("checked", true);
    // } else if (this.activity.type === "noRoll"){
    //   this.element.find("#noRollActivity").attr("checked", true);
    // }
    // 
    this.element.find('#' + this.activity.type).attr("checked", true);
    console.log(this.element.find('#' + this.activity.type), this.activity.type)
    // Set initial state of dropdowns to stored values
    if (this.activity.complication !== undefined) {
      this.element.find("#compchance").val(this.activity.complication.chance);
      this.element.find("#complications").val(this.activity.complication.roll_table);
    }
    // Set initial values of our options
    this.element.find("#privateActivity").attr("checked", this.activity.options.rolls_are_private);
    this.element.find("#privateComp").attr("checked", this.activity.options.complications_are_private)
    this.element.find("#timeTaken").val(this.activity.options.days_used);
    this.element.find("#materials").attr("checked", this.activity.options.ask_for_materials)

    // Set initial values of rollables
    this.element.find("#rollableEventsTable > #rollable").each((i, roll) => {
      let id = $(roll).attr("data-id");
      if (id === "template") return;
      let event = this.activity.roll[i - 1]
      let type = event.type;
      let newVal = event.roll || "";

      $(roll).find("#roll-type > select").val(type);
      // Set all roll-val to off
      $(roll).find("#roll-val").find("select, input").css("display", "none");
      $(roll).find("#roll-val").find("select, input").prop("disabled", true);
      // Turn on the correct select based on type
      $(roll).find("#roll-val").find("#" + type).css("display", "");
      $(roll).find("#roll-val > #" + type).val(newVal);
      $(roll).find("#roll-val").find("#" + type).prop("disabled", false);
    });
  }

  async handleImage(event) {
    // Make a new FilePicker to allow the user to 
    // use their own pictures. Update the img
    // in the form when an image is chosen.
    const fp = new FilePicker({
        type: "image",
        callback: (path) => {
            this.image = path;
            $(event.currentTarget).attr("src", path);
        }
    }).browse("");
  }

  /**
   * Adds a new rollable <li> to the list of rollables. Accomplishes
   * this by copying a hidden template and activating it.
   */
  addRollable(){
    // Copy our template roll
    let newRoll = this.element.find('#rollableEventsTable > li[data-id ="template"]').clone();
    // Assign temporary id
    newRoll.attr("data-id", randomID());
    // Show it!
    newRoll.css("display", "");
    // Enable it
    newRoll.find("#roll-type > select, #roll-val > #ABILITY_CHECK").prop("disabled", false)
    // Append
    this.element.find("#rollableEventsTable").append(newRoll);
    // Attach new listener
    newRoll.find(".result-controls > .delete-roll").click((event) => this.deleteRollable(event));
    newRoll.find("#roll-type > select").change((event) => this.changeValSelect(event));
  }

  /**
   * Deletes a <li> from the rollalbe list.
   * @param  {[jQuery object]} event Click event from clicking the delete-roll button
   */
  deleteRollable(event){
    event.preventDefault();
    // Retrieve the row we are in
    let row = $(event.currentTarget).parent().parent();
    // Remove it from DOM
    row.remove();
  }

  validateCustom() {
    this.activity.roll.forEach((roll) => {
      if (roll.type === "CUSTOM"){
        let custom = roll.roll;
        let context = mergeObject({actor: this.actor}, this.actor.getRollData());
        if (Roll.validate(custom, context)){//ensure no error in custom
          let fail = false;
          custom.split(" + ").forEach((formu) => {
            // If we're accessing a property
            if (formu.startsWith("@")) {
              // Remove either "@actor." or just "@"
              let testProp = formu.startsWith("@actor.") ? formu.slice(7) : formu.slice(1);
              // Test if property does not exist (i.e. if not a valid property)
              if (!(getProperty(this.actor, testProp)) && !(getProperty(this.actor.getRollData(), testProp))) {
                ui.notifications.warn("Ethck's Downtime Tracking | " + formu + " is not present in the context.");
                fail = true;
              }
            }
          })
          if (fail) throw "Error in context for rolling.";
        } else {
          ui.notifications.warn("Ethck's Downtime Tracking | This is not a valid roll formula.");
          return;
        }
      }
    });
  }

  /**
   * Handle changes of the "Roll Type" to dynamically change the "Roll"
   * options. For all except type "custForm" we unhide a <select> with
   * dynamic options. "custForm" maintains a simple input.
   * 
   * @param  {[jQuery object]} event triggering change event from a "Roll Type" select.
   */
  changeValSelect(event) {
    event.preventDefault();

    let valSelect = $(event.currentTarget).parent().parent().find("#roll-val");
    let type = $(event.currentTarget).val();

    valSelect.find("select, input").css("display", "none");
    valSelect.find("select, input").prop("disabled", true);
    valSelect.find("#" + type).css("display", "");
    valSelect.find("#" + type).prop("disabled", false);
  }
  
  addResult() {
    // Copy our template result
    let newResult = this.element.find('#resultsTable > li[data-id ="template"]').clone();
    // Assign temporary id
    newResult.attr("data-id", randomID());
    // Show it!
    newResult.css("display", "");
    // Append
    this.element.find("#resultsTable").append(newResult);
    // Attach new listener
    newResult.find(".result-controls > .delete-result").click((event) => this.deleteResult(event));
  }

  deleteResult(event) {
    event.preventDefault();
    // Retrieve the row we are in
    let row = $(event.currentTarget).parent().parent();
    // Remove it from DOM
    row.remove();
  }
  /*
  Loads data from a "form" table that stores the values in each column as
  a seperate array into an array of rows, where each row has the same
  shape as `model`.
  
  As an example, for `rows` with the shape:
    [{group: "a", dc: 8}, {group: "b", dc: 72}, {group: "c", dc: 3}]
  would be represented with columns (expanded FormData) that has the shape:
    {group: ["a", "b", "c"], dc: [8, 72, 3]}
  
  The algorithm assumes that any 'null' or 'undefined' value
  found in a column's data is a disabled field and is thus 
  filtered out. 
  
  Other assumptions:
    - A column will either be undefined, or be an array with the same
      length as other defined columns.
    - All existing rows have defined values for all keys in `model`.

  @param  {[object]} rows      currently filled out model with vals
  @param {[object]} columns    expanded FormData 
  @param {[object]} model      data model to base structure on
  @param {[String]} dataPrefix prefix for column names

  Special thanks to @Varriount#0883 for their help on this!
  */
  loadModelFromTable(rows, columns, model, dataPrefix){
    for (const key of Object.keys(model)){
      // Retrieve the column of data, ignore all falsy values
      const column = columns[dataPrefix + "." + key].filter((x) => x);

      // Calculate where rows currently exist, and where they will
      // need to be created.
      // This is because, if we extend the length of `rows`, we will have 2
      // sections - one containing existing rows, and one containing
      // `undefined` values.
      const existingRowsEnd = Math.min(column.length, rows.length);
      const allRowsEnd = column.length;

      // Shrink or extend `rows` to remove or add new rows.
      rows.length = column.length;

      // Loop through the data in the current column.
      let i = 0;

      // Update existing rows with the column data.
      for (; i < existingRowsEnd; i++) {
        rows[i][key] = column[i];
      }

      // Create new rows with the column data.
      for (; i < allRowsEnd; i++) {
        const row = {};
        row[key]  = column[i];
        rows[i]   = row;
      }
    }
  }

  async _updateObject(event, formData) {
    // preserve old ID or make new one
    let id = 0;
    if ("id" in this.activity) {
      id = this.activity.id;
    } else {
      id = randomID();
    }

    let rolls = this.activity.roll;
    let results = this.activity.result;
    // recreate activity
    this.activity = expandObject(formData);
    this.activity.id = id;

    this.activity.roll = rolls;
    this.activity.result = results;

    this.activity.chat_icon = this.image;
    this.loadModelFromTable(this.activity.roll, formData, ACTIVITY_ROLL_MODEL, "roll");
    this.loadModelFromTable(this.activity.result, formData, ACTIVITY_RESULT_MODEL, "result");

    // extra validate on custom formulas...
    try {
      this.validateCustom();
    } catch (e) {
      console.error(e);
      throw "Ethck's Downtime Tracking | Broken custom formula. Please fix."
    }

    console.log(this.activity)
    // Update!!!
    const actor = this.actor;
    // local scope
    if (!jQuery.isEmptyObject(actor)) {
      let flags = actor.getFlag("downtime-ethck", "trainingItems");

      if (this.edit) {
        let act = flags.find((act) => act.id == this.activity.id);
        let idx = flags.indexOf(act);
        flags[idx] = this.activity;
      } else {
        flags.push(this.activity);
      }
      await actor.unsetFlag("downtime-ethck", "trainingItems")
      await actor.setFlag("downtime-ethck", "trainingItems", flags)
    // World scope
    } else {
      this.activity["world"] = true;
      const settings = game.settings.get("downtime-ethck", "activities");
      if (this.edit) {
        let act = settings.find((act) => act.id == this.activity.id);
        let idx = settings.indexOf(act);
        settings[idx] = this.activity;
      } else {
        settings.push(this.activity);
      }
      await game.settings.set("downtime-ethck", "activities", settings);
    }
  }
}
