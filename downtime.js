export class DWTForm extends FormApplication {
  constructor(actor = {}, activity = {}, editMode = false, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.rollableEvents = activity["rollableEvents"] || [];
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
      "modules/downtime-ethck/templates/add-downtime-form.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
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
      "Glassblower's Tools",
      "Jeweler's Tools",
      "Leatherworker's Tools",
      "Mason's Tools",
      "Painter's Supplies",
      "Poisoner's Kit",
      "Potter's Tools",
      "Smith's Tools",
      "Tinker's Tools",
      "Weaver's Tools",
      "Woodcarver's Tools"
    ]


    //tools = this.actor.items.filter((item) => item.type === "tool") || []
    //tools.map((tool) => this.actor.getOwnedItem(tool.data._id))

    const activity = this.activity;
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
    // Add Rollable
    this.element
      .find(".addRollable")
      .click((event) => this.handleRollables(event));
    // Handle deletes in table
    this.element
      .find("#rollableEventsTable > tbody > .rollableEvent")
      .on("click", "#deleteRollable", (event) =>
        this.handleRollableDelete(event)
      );
    // Add results
    this.element.find(".addResult").click((event) => this.handleResults(event));
    // Deletes on result(s)
    this.element
      .find("#resultsTable > tbody > .result")
      .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
    // Picture picker
    this.element.find(".file-picker").click((event) => this.handleImage(event));

    // Not really a listener, but update the state of this.
    if (this.activity.type === "categories"){
        this.element.find("#categoryActivity").attr("checked", true);
    }
    // Set initial state of dropdowns to stored values
    if (this.activity.complication !== undefined) {
      this.element.find("#compchance").val(this.activity.complication.chance)
      this.element.find("#complications").val(this.activity.complication.table)
    }
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

  handleRollableDelete(event) {
    // In the rollable table, handle removing elements
    event.preventDefault();
    const elem = $(event.currentTarget).parent().parent();
    const toDel = this.rollableEvents.find((rbl) => rbl[2] == elem.attr("id"));
    const idx = this.rollableEvents.indexOf(toDel);
    this.rollableEvents.splice(idx, 1);
    elem.remove();
  }

  handleRollables(event) {
    // When adding a new roll
    event.preventDefault();
    // Setup DOM references
    const abiElem = this.element.find("#abiCheck");
    const saveElem = this.element.find("#saveSelect");
    const skiElem = this.element.find("#skiCheck");
    const toolElem = this.element.find("#toolSelect");
    const dcElem = this.element.find("#dc");
    // Get Vals
    const abi = abiElem.val();
    const save = saveElem.val();
    const ski = skiElem.val();
    const tool = toolElem.val();
    const dc = dcElem.val();
    // Error Handling
    let rbl = "";

    if (abi !== "") {
      rbl = abi;
    } else if (save !== "") {
      rbl = save;
    } else if (ski !== "") {
      rbl = ski;
    } else if (tool !== ""){
      rbl = tool;
    }

    if (dc === "" || rbl === "") {
      ui.notifications.error("ERROR! Select roll and DC first!");
      return;
    }
    // End Errors
    // Get a unique ID
    const time = Date.now();
    // Add event
    this.rollableEvents.push([rbl, dc, time]);
    // Add the row that shows in the form (DOM!)
    this.element.find("#rollableEventsTable").append(
      `
            <tr id="` + time + `" class="rollableEvent">
                <td><label>` + rbl + `</label></td>
                <td><label>` + dc + `</label></td>
                <td><input type="text" id="group" placeholder="group name for rolls"></td>
                <td style="text-align:center;"><a class="item-control training-delete" id="deleteRollable" title="Delete">
                    <i class="fas fa-trash"></i></a>
                </td>
            </tr>`
    );

    //reset to initial vals
    abiElem.val($("#abiCheck option:first").val());
    saveElem.val($("#saveSelect option:first").val());
    skiElem.val($("#skiCheck option:first").val());
    skiElem.val($("#toolSelect option:first").val());
    dcElem.val($("#dc option:first").val());
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

    const min = this.element.find("#resultMin");
    const max = this.element.find("#resultMax");
    const text = this.element.find("#resultText");

    const minV = min.val();
    const maxV = max.val();
    const textV = text.val();
    // Errors...
    if (minV === "" || maxV === "" || textV === "") {
      ui.notifications.error("Fill in min, max, and text before submission.");
      return;
    } else if (isNaN(minV) || isNaN(maxV)) {
      ui.notifications.error("Min and Max only accept numbers.");
      return;
    }
    // ID
    const time = Date.now();
    // Add event
    this.results.push([parseInt(minV), parseInt(maxV), textV, time]);
    // Add the row that shows in the form (DOM!)
    this.element.find("#resultsTable").append(
      `<tr id="` +time +`" class="result">
        <td><label>` +minV + `</label></td>
        <td><label>` +maxV + `</label></td>
        <td><label>` +textV + `</label></td>
        <td style="text-align:center;"><a class="item-control training-delete" id="deleteResult" title="Delete">
            <i class="fas fa-trash"></i></a>
        </td>
      </tr>`
    );

    //reset to initial vals
    min.val("");
    max.val("");
    text.val("");
  }

  async _updateObject(event, formData) {
    // create/edit activity to show
    // Get vals from form
    const actName = this.element.find("#name").val();
    const actDesc = this.element.find("#desc").val();
    const actType =
      this.element.find("#succFailActivity:checked").val() ||
      this.element.find("#categoryActivity:checked").val();

    // Make the complication object with table id and chance
    const complication = {
      table: this.element.find("#complications").val(),
      chance: parseInt(this.element.find("#compchance").val())
    }

    // Handle OR grouping of rollableEvents
    let rollableGroups = [{ group: "", rolls: [] }];
    this.rollableEvents.map((rollableEvent) => {
      const groupVal = this.element
        .find("#" + rollableEvent[2] + " > td > #group")
        .val();
      rollableGroups.map((groupDict) => {
        if (groupDict["group"] == groupVal) {
          groupDict["rolls"].push(rollableEvent);
          return;
        }
      });

      if (
        rollableGroups.find((group) => group["group"] === groupVal) ===
        undefined
      ) {
        const groupDict = {
          group: groupVal,
          rolls: [rollableEvent],
        };

        rollableGroups.push(groupDict);
      }
    });

    let activity = {};
    if (!this.edit) {
      activity = {
        name: actName || "New Downtime Activity",
        description: actDesc || "",
        changes: [],
        rollableEvents: this.rollableEvents,
        rollableGroups: rollableGroups,
        results: this.results,
        id: Date.now(),
        type: actType,
        img: this.image,
        complication: complication
      };
    } else {
      activity = this.activity;
      activity["name"] = actName;
      activity["description"] = actDesc;
      activity["rollableEvents"] = this.rollableEvents;
      activity["rollableGroups"] = rollableGroups;
      activity["results"] = this.results;
      activity["type"] = actType;
      activity["img"] = this.image;
      activity["complication"] = complication;
    }

    const actor = this.actor;
    // local scope
    if (!jQuery.isEmptyObject(actor)) {
      const flags = actor.data.flags["downtime-ethck"];
      if (!this.edit) {
        activity["world"] = false;
        // Update flags and actor
        flags.trainingItems.push(activity);
      }
      actor.update({ "flags.downtime-ethck": null }).then(function () {
        actor.update({ "flags.downtime-ethck": flags });
      });
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
