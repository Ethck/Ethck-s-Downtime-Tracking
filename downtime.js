export class DWTForm extends FormApplication {
  constructor(actor = {}, activity = {}, editMode = false, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.rollableEvents = activity["rollableEvents"] || [];
    this.rolls = activity["rolls"];
    this.results = activity["results"] || [];
    this.actor = actor;
    this.edit = editMode;
    this.image = activity["img"] || ""
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    if (this.edit) {
      options.title = "Edit a Downtime Activity";
    } else {
      options.title = "Add a Downtime Event";
    }
    options.id = "downtime-ethck";
    options.template =
      "modules/downtime-ethck/templates/add-downtime-form2.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 800;
    options.height = "auto";
    return options;
  }

  async getData() {
    // Return data to the template
    const abilities = CONFIG.DND5E.abilities;
    const saves = CONFIG.DND5E.abilities;
    const skills = CONFIG.DND5E.skills;
    const tools = [
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
    ]

    const activity = this.activity;

    console.log(activity.rolls);

    const tables = game.tables;
    const compChances = [10, 25, 50, 75, 100]

    return {
      abilities,
      saves,
      skills,
      tools,
      activity,
      tables,
      compChances
    };
  }

  render(force, context = {}) {
    // Only re-render if needed
    const { action, data } = context;
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
    // // Add results
    // this.element.find(".addResult").click((event) => this.handleResults(event));
    // // Deletes on result(s)
    // this.element
    //   .find("#resultsTable > tbody > .result")
    //   .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
    // Picture picker
    // 
    this.element.find(".addRollable").click(() => this.addRollable());
    this.element.find("#rollableEventsTable > li > .result-controls > .delete-roll").click((event) => this.deleteRollable(event));
    this.element.find(".file-picker-cust").click((event) => this.handleImage(event));

    // Not really a listener, but update the state of this.
    if (this.activity.type === "categories"){
        this.element.find("#categoryActivity").attr("checked", true);
    } else if (this.activity.type === "noRoll"){
      this.element.find("#noRollActivity").attr("checked", true);
    }
    // Set initial state of dropdowns to stored values
    if (this.activity.complication !== undefined) {
      this.element.find("#compchance").val(this.activity.complication.chance);
      this.element.find("#complications").val(this.activity.complication.table.id);
    }
    // Set initial values of our options                        OLD                      NEW
    this.element.find("#privateActivity").attr("checked", this.activity.private || this.activity.actPrivate);
    this.element.find("#privateComp").attr("checked", this.activity.compPrivate)
    this.element.find("#timeTaken").val(this.activity.timeTaken);
    this.element.find("#materials").attr("checked", this.activity.useMaterials)

    // Set initial values of rollables
    this.element.find("#rollableEventsTable > #rollable").each((i, roll) => {
      let id = $(roll).attr("data-id");
      if (id === "blank") return;
      let event = this.rolls.find((rble) => rble.id == id);
      let type = event.type;
      let newVal = event.val || "";
      $(roll).find("#roll-type > select").val(type);
      $(roll).find("#roll-val > select").val(newVal);
    })
  }

  /**
   * Adds a new rollable <li> to the list of rollables. Accomplishes
   * this by copying a hidden template and activating it.
   */
  addRollable(){
    // Copy our template roll
    let newRoll = this.element.find('#rollableEventsTable > li[data-id ="blank"]').clone();
    // Assign temporary id
    newRoll.attr("data-id", randomID());
    // Show it!
    newRoll.css("display", "");
    // Append
    this.element.find("#rollableEventsTable").append(newRoll);
    // Attach new listener
    newRoll.find(".result-controls > .delete-roll").click((event) => this.deleteRollable(event));
  }

  /**
   * Deletes a <li> from the rollalbe list.
   * @param  {[jQuery object]} event Click event from clicking the delete-roll button
   */
  deleteRollable(event){
    // Retrieve the row we are in
    let row = $(event.currentTarget).parent().parent();
    // Remove it from DOM
    row.remove();
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

  handleRollables() {

    let rollables = [];

    this.element.find("#rollableEventsTable > #rollable").each((i, roll) => {

      let typeRoll = $(roll).find("#roll-type > select").val();
      let rollVal = $(roll).find("#roll-val > select").val();
      let group = $(roll).find("#roll-group > input").val();
      let dc = $(roll).find("#roll-dc > input").val();


      if (typeRoll === "custForm"){
        let custom = $(roll).find("#roll-val > input").val();
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
          rollVal = custom;
        } else {
          ui.notifications.warn("Ethck's Downtime Tracking | This is not a valid roll formula.");
          return;
        }
        
      }

      // Get a unique ID
      let id = randomID();
      // Add event
      rollables.push({type: typeRoll, dc: dc, id: id, group: group, val: rollVal})
      // Add the row that shows in the form (DOM!)
    });
    this.rolls = rollables;
  }

  handleResultDelete(event) {
    // Delete result
    event.preventDefault();
    const elem = $(event.currentTarget).parent().parent();
    const toDel = this.results.find((res) => res[3] == elem.attr("id"));
    const idx = this.results.indexOf(toDel);
    this.results.splice(idx, 1);
    elem.remove();
  }

  handleResults(event) {
    // Add result to table
    event.preventDefault();

    const minV = "0";
    const maxV = "5";
    const textV = "You win 5 cakes."
    // ID
    const time = Date.now();
    // Add event
    this.results.push([parseInt(minV), parseInt(maxV), textV, time]);
    // Add the row that shows in the form (DOM!)
    this.element.find("#resultsTable > tbody").append(
      `<tr id="` + time +`" class="result">
        <td><input style="margin: 5px;" value="`+ minV +`" type="text" id="rollStart"></input></td>
        <td><input style="margin: 5px;" value="` + maxV + `" type="text" id="rollEnd"></input></td>
        <td><input style="margin: 5px;" value="` + textV + `" type="text" id="rollDesc"></input></td>
        <td style="text-align:center;"><a class="item-control training-delete" id="deleteResult" title="Delete">
            <i class="fas fa-trash"></i></a>
        </td>
      </tr>`
    );

    this.element
      .find("#resultsTable > tbody > #" + time)
      .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
  }

  async _updateObject(event, formData) {
    // create/edit activity to show
    // Get vals from form
    const actName = this.element.find("#name").val();
    const actDesc = this.element.find("#desc").val();
    const actRollImage = this.element.find('[name="rollIcon"]').val() || "icons/svg/d20.svg";
    const actType =
      this.element.find("#succFailActivity:checked").val() ||
      this.element.find("#categoryActivity:checked").val() ||
      this.element.find("#noRollActivity:checked").val();
    const actPrivate = this.element.find("#privateActivity").prop("checked");
    const compPrivate = this.element.find("#privateComp").prop("checked");
    const actTimeTaken = this.element.find("#timeTaken").val();
    const useMaterials = this.element.find("#materials").prop("checked");

    // Make the complication object with table and chance

    const complication = {
      table: {
        id: this.element.find("#complications").val()
      },
      chance: parseInt(this.element.find("#compchance").val())
    }


    // // Override value of this.rollableEvents with the input in the form.
    // this.rollableEvents = this.rollableEvents.map((rollableEvent) => {
    //   return [
    //     rollableEvent[0],
    //     this.element.find("#" + rollableEvent[2] + " > td > #dc").val(),
    //     rollableEvent[2]
    //   ];
    // });

    // // Handle OR grouping of rollableEvents
    // let rollableGroups = [{ group: "", rolls: [] }];
    // this.rollableEvents.forEach((rollableEvent) => {
    //   const groupVal = this.element
    //     .find("#" + rollableEvent[2] + " > td > #group")
    //     .val();
    //   rollableGroups.forEach((groupDict) => {
    //     if (groupDict["group"] == groupVal) {
    //       groupDict["rolls"].push(rollableEvent);
    //     }
    //   });

    //   if (
    //     rollableGroups.find((group) => group["group"] === groupVal) ===
    //     undefined
    //   ) {
    //     const groupDict = {
    //       group: groupVal,
    //       rolls: [rollableEvent],
    //     };

    //     rollableGroups.push(groupDict);
    //   }
    // });

    try {
      this.handleRollables();
    } catch (e) {
      console.log(e);
      throw "Ethck's Downtime Tracking | Broken custom formula. Please fix."
    }


    // Add "new" values from the input fields so that changes are reflected.
    this.results = this.results.map((result) => {
      return[
        parseInt(this.element.find("#" + result[3] + " > td > #rollStart").val()),
        parseInt(this.element.find("#" + result[3] + " > td > #rollEnd").val()),
        this.element.find("#" + result[3] + " > td > #rollDesc").val(),
        result[3]
      ];
    });


    // Setup or update the values of our activity
    let activity = {};
    if (!this.edit) {
      activity = {
        name: actName || "New Downtime Activity",
        description: actDesc || "",
        changes: [],
        rollableEvents: this.rollableEvents,
        results: this.results,
        id: Date.now(),
        type: actType,
        img: this.image,
        complication: complication,
        actPrivate: actPrivate,
        compPrivate: compPrivate,
        actTimeTaken: actTimeTaken,
        rollIcon: actRollImage,
        useMaterials: useMaterials,
        rolls: this.rolls
      };
    } else {
      activity = this.activity;
      activity["name"] = actName;
      activity["description"] = actDesc;
      activity["rollableEvents"] = this.rollableEvents;
      activity["results"] = this.results;
      activity["type"] = actType;
      activity["img"] = this.image;
      activity["complication"] = complication;
      activity["actPrivate"] = actPrivate;
      activity["compPrivate"] = compPrivate;
      activity["timeTaken"] = actTimeTaken;
      activity["rollIcon"] = actRollImage;
      activity["useMaterials"] = useMaterials;
      activity["rolls"] = this.rolls;
    }

    const actor = this.actor;
    // local scope
    if (!jQuery.isEmptyObject(actor)) {
      let flags = actor.getFlag("downtime-ethck", "trainingItems");
      if (!this.edit) {
        activity["world"] = false;
        // Update flags and actor
        flags.push(activity);
      }
      await actor.unsetFlag("downtime-ethck", "trainingItems")
      await actor.setFlag("downtime-ethck", "trainingItems", flags)
    // World scope
    } else {
      activity["world"] = true;
      const settings = game.settings.get("downtime-ethck", "activities");
      if (this.edit) {
        let act = settings.find((act) => act.id == activity.id);
        let idx = settings.indexOf(act);
        settings[idx] = activity;
      } else {
        settings.push(activity);
      }
      await game.settings.set("downtime-ethck", "activities", settings);
    }
  }
}
