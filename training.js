// Imports
import AuditLog from "./audit-log.js";
import { DWTForm } from "./downtime.js";
import { GMConfig } from "./gmConfig.js";
import { ChooseRoll } from "./chooseRoll.js";

// Register Game Settings
Hooks.once("init", () => {
  game.settings.registerMenu("downtime-ethck", "config", {
    name: "Config",
    label: "Access Config Menu",
    hint: "Access the configuration menu to find additional options.",
    icon: "fas fa-desktop",
    type: GMConfig,
    restricted: true,
  });

  game.settings.register("downtime-ethck", "enableTraining", {
    name: "Show Training Tab on PCs",
    hint: "Display the training tab for Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "enableTrainingNpc", {
    name: "Show Training Tab on NPCs",
    hint: "Display the training tab for Non-Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "aboutTimeCompat", {
    name: "Enable About Time Compatibility",
    hint: "Allows for About Time month/day to appear in Activity Log",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "crashCompat", {
    name: "Enable Compatibility for Crash's 5e Downtime Tracking",
    hint: "Allows for Crash's Downtime and this module to reside in the same tab.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "tabName", {
    name: "Tab Name",
    hint: "Name for the custom downtime tab",
    scope: "world",
    config: true,
    default: "Downtime",
    type: String,
  });

  game.settings.register("downtime-ethck", "dcRollMode", {
    name: "DC Roll Mode",
    hint: "Roll Mode used when downtime activities' DCs are called",
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmroll: "GM Roll (Player can see)",
      blindroll: "Blind Roll (Player can't see)",
    },
    default: "blindroll",
  });

  game.settings.register("downtime-ethck", "activities", {
    scope: "world",
    config: false,
    default: [],
  });

  game.settings.register("downtime-ethck", "changes", {
    scope: "world",
    config: false,
    default: {},
  });
});

// The Meat And Potatoes
async function addTrainingTab(app, html, data) {
  // Determine if we should show the downtime tab
  let showTrainingTab = false;
  if (data.isCharacter) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTraining");
  } else if (data.isNPC) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTrainingNpc");
  }

  if (showTrainingTab) {
    // Get our actor
    let actor = game.actors.entities.find((a) => a.data._id === data.actor._id);
    // Make sure flags exist if they don't already
    if (
      actor.data.flags["downtime-ethck"] === undefined ||
      actor.data.flags["downtime-ethck"] === null
    ) {
      await actor.setFlag("downtime-ethck", "trainingItems", [])
      await actor.setFlag("downtime-ethck", "changes", [])
    }
    //let flags = actor.data.flags["downtime-ethck"];
    let flags = actor.getFlag("downtime-ethck", "trainingItems")

    let CRASH_COMPAT = false;
    const crash5eTraining = game.modules.get("5e-training")

    if (crash5eTraining !== undefined && crash5eTraining.active === true && game.settings.get("downtime-ethck", "crashCompat")) {
      if (isNewerVersion(crash5eTraining.data.version, "0.4.6")) { // version must be GREATER to return true.
        CRASH_COMPAT = true;
      } else {
        ui.notifications.warn("Please update Crash's 5e Downtime Tracking to version 0.4.7 or greater to enable compaitbility.")
      }
    } else {
      // Update the nav menu
      let tabName = game.settings.get("downtime-ethck", "tabName");
      let trainingTabBtn = $(
        '<a class="item" data-tab="downtime">' + tabName + "</a>"
      );
      let tabs = html.find('.tabs[data-group="primary"]');
      tabs.append(trainingTabBtn);
    }

    const skills = CONFIG.DND5E.skills;

    // Create the tab content
    let sheet = html.find(".sheet-body");

    let ethckDowntimeTabHtml = $(
      await renderTemplate(
        "modules/downtime-ethck/templates/training-section.html",
        {
          activities: game.settings.get("downtime-ethck", "activities"),
          actorAct: data,
        }
      )
    );


    let downtimeHTML = await compileDowntimeTab(CRASH_COMPAT, ethckDowntimeTabHtml, sheet, html);

    // Add New Downtime Activity
    downtimeHTML.find(".activity-add").click(async (event) => {
      event.preventDefault();
      let form = new DWTForm(actor);
      form.render(true);
      fixActiveTab(app, CRASH_COMPAT)
    });

    // Edit Downtime Activity
    downtimeHTML.find(".activity-edit").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-edit-", ""));
      let activity = flags[trainingIdx];
      let form = new DWTForm(actor, activity, true);
      form.render(true);
      fixActiveTab(app, CRASH_COMPAT)
    });

    // Remove Downtime Activity
    downtimeHTML.find(".activity-delete").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-delete-", ""));
      let activity = flags[trainingIdx];
      let del = false;
      let dialogContent = await renderTemplate(
        "modules/downtime-ethck/templates/delete-training-dialog.html"
      );

      // Create dialog
      new Dialog({
        title: `Delete Downtime Activity`,
        content: dialogContent,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label:"Delete",
            callback: () => (del = true),
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel",
            callback: () => (del = false),
          },
        },
        default: "yes",
        close: async (html) => {
          if (del) {
            // Delete item and update actor
            flags.splice(trainingIdx, 1);
            await actor.unsetFlag("downtime-ethck", "trainingItems")
            await actor.setFlag("downtime-ethck", "trainingItems", flags)
            fixActiveTab(app, CRASH_COMPAT)
          }
        },
      }).render(true);
    });

    // Roll To Train
    downtimeHTML.find(".activity-roll").click(async (event) => {
      event.preventDefault();

      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-roll-", ""));
      let activity = {};

      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[
          trainingIdx
        ];
      }

      let res = [];

      let rolls = [];
      if (activity.rollableGroups.every((rg) => rg.rolls.length <= 1)){ //No ORs in activity
        activity.rollableGroups.forEach((group) => {
          if (group.rolls.length >= 1){
            rolls.push(group.rolls[0])
          }
        });
      } else { // Some ORs in Activity
        let form = new ChooseRoll(actor, activity)
        const choices = await form.chooseRollDialog();
        for (let rg of activity.rollableGroups){
          for (let c of choices){
            const choice = rg.rolls.find((roll) => roll[2] === c)
            if (choice !== undefined){
              rolls.push(choice)
              break;
            }
          }
        }
      }

      try {
        let rollRes = rolls.map(async (roll) => {
          return await rollRollable(actor, activity, roll);
        })
        res.push(...await Promise.all(rollRes))
        outputRolls(actor, activity, event, trainingIdx, res);
        fixActiveTab(app, CRASH_COMPAT)
      } catch (e) {
        console.log(e);
      }

  });

    // Toggle Information Display
    // Modified version of _onItemSummary from dnd5e system located in
    // dnd5e/module/actor/sheets/base.js
    downtimeHTML.find(".activity-toggle-desc").click(async (event) => {
      event.preventDefault();
      // Set up some variables
      //let flags = actor.data.flags["downtime-ethck"];
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-toggle-desc-", ""));
      let activity = {};

      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[
          trainingIdx
        ];
      }

      let desc = "";
      for (let rollable of activity.rollableEvents) {
        desc += rollable[0] + " DC: " + rollable[1] + "</br>";
      }

      let li = $(event.currentTarget).parents(".item");

      if (li.hasClass("expanded")) {
        let summary = li.children(".item-summary");
        summary.slideUp(200, () => summary.remove());
      } else {
        let div = $(
          `<div class="item-summary"><label>` + desc + `</label></div>`
        );
        li.append(div.hide());
        div.slideDown(200);
      }
      li.toggleClass("expanded");
    });

    // Review Changes
    downtimeHTML.find(".activity-log").click(async (event) => {
      event.preventDefault();
      new AuditLog(actor).render(true);
    });

    // Set Training Tab as Active
    downtimeHTML.find('.tabs .item[data-tab="downtime"]').click((ev) => {
      app.activateDowntimeTab = true;
    });

    // Unset Training Tab as Active
    downtimeHTML
      .find('.tabs .item:not(.tabs .item[data-tab="downtime"])')
      .click((ev) => {
        app.activateDowntimeTab = false;
      });
  }
}

Hooks.on(`renderActorSheet`, (app, html, data) => {
  addTrainingTab(app, html, data).then(function () {
    if (app.activateDowntimeTab) {
      app._tabs[0].activate("downtime");
    }
  });
});

async function outputRolls(actor, activity, event, trainingIdx, res){
  let cmsg = "";
  let cmsgResult = "";

  if (activity.type === "succFail") {
    let booleanResults = [0, 0];
    res.map((pair) => {
      if (pair[0] >= pair[1]) {
        //Rolled is greater than dc
        booleanResults[0] += 1;
      } else {
        //Rolled is less than dc
        booleanResults[1] += 1;
      }
    });

    cmsg =
      "With " +
      booleanResults[0] +
      " successes and " +
      booleanResults[1] +
      " failures.";
    activity.results.forEach((result) => {
      if (
        result[0] <= booleanResults[0] &&
        result[1] >= booleanResults[0]
      ) {
        cmsgResult = result[2];
      }
    });
  } else if (activity.type === "categories") {
    activity.results.forEach((result) => {
      if (res[0][0] >= result[0] && res[0][0] <= result[1]) {
        cmsg = "Result: ";
        cmsgResult = result[2];
      }
    });
  }

  const cmsgTemplate = await renderTemplate("modules/downtime-ethck/templates/chatMessage.html", {img: activity.img, text: cmsg, result: cmsgResult})

  // Determine if we whisper this message, and who to
  const cmsgVis = activity.private || game.settings.get("core", "rollMode") !== "roll";
  const gmUserIds = game.data.users.filter((user) => user.role === 4).map((gmUser) => gmUser._id)

  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: cmsgTemplate,
    flavor: "has completed the downtime activity of " + activity.name,
    type: CONST.CHAT_MESSAGE_TYPES.IC,
    whisper: cmsgVis ? [game.user._id, ...gmUserIds] : []
  });

  // Test if complications are being used
  if (activity.complication !== undefined && (activity.complication.chance !== " " || activity.complication.table !== " ")){
    const num = Math.floor(Math.random() * 100) + 1 // 1-100
    if (num <= activity.complication.chance){
      // Complication has occured
      const tableRes = game.tables.get(activity.complication.table);
      // Also outputs chat message, YAY!
      let opts = {};
      if (activity.compPrivate === true){
        opts["rollMode"] = "blindroll";
      }
      tableRes.draw(opts)
    }
  }

  let timestamp = Date.now()

  // About Time Compat
  if (game.settings.get("downtime-ethck", "aboutTimeCompat")) {
    const aboutTime = game.modules.get("about-time")
    if (aboutTime !== undefined && aboutTime.active === true){
      timestamp = game.Gametime.DTNow().longDate().date;
    }
  } else {
    timestamp = new Date(timestamp).toDateString()
  }

  const change = {
    timestamp: timestamp,
    user: game.user.name,
    activityName: activity.name,
    result: cmsg,
    timeTaken: activity.timeTaken
  }

  let flags = actor.getFlag("downtime-ethck", "changes");
  flags.push(change)
  await actor.unsetFlag("downtime-ethck", "changes")
  await actor.setFlag("downtime-ethck", "changes", flags)
}

async function rollDC(rollable) {
  const rdc = new Roll(rollable[1]);
  const dcRoll = rdc.roll();
  dcRoll.toMessage(
    {},
    {
      rollMode: game.settings.get("downtime-ethck", "dcRollMode"),
      create: true,
    }
  );

  return dcRoll;
}

async function rollRollable(actor, activity, rollable) {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  const skills = CONFIG.DND5E.skills;
  let res = []
  const toolFilters = ["Tool", "Supplies", "Kit", "Instrument", "Utensils", "Set"]

  if (rollable[0].includes("Check")) {
    let abiAcr = abilities.find((abi) =>
      rollable[0].toLowerCase().includes(abi)
    );
    await actor.rollAbilityTest(abiAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  } else if (rollable[0].includes("Saving Throw")) {
    let abiAcr = abilities.find((abi) =>
      rollable[0].toLowerCase().includes(abi)
    );
    await actor.rollAbilitySave(abiAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  } else if (toolFilters.some((filter) => rollable[0].includes(filter))) {
    let actorTool;
    if (rollable[0].includes("Instrument")){
      const actorTools = actor.items.filter((item) => item.type === "tool" && item.data.name.includes("Instrument"))
      let musicActivity = {
        rollableGroups: [{
          group: "",
          rolls: actorTools.map((tool, index) => [tool.data.name, rollable[1], index])
        }]
      }
      let form = new ChooseRoll(actor, musicActivity)
      const choice = await form.chooseRollDialog();
      const toolName = musicActivity.rollableGroups[0].rolls.find((roll) => roll[2] === choice[0])[0]
      actorTool = actor.items.find((item) => item.data.name === toolName)
    } else {
      actorTool = actor.items.find((item) => item.type === "tool" && item.data.name.toLowerCase() == rollable[0].toLowerCase());
    }

    if (actorTool !== null) {
      await actorTool.rollToolCheck().then(async (r) => {
        const dc = await rollDC(rollable);
        res = [r._total, dc._total];
      })
    } else {
      // No tool of that name found.
      ui.notifications.error("Tool with name " + rollable[0] + " not found. Please ensure the name is correct.");
      res = [];
    }
  } else if (rollable[0].includes("Formula:")) {
    const formulaRoll = new Roll(rollable[0].split("Formula: ")[1])
    const formRoll = await formulaRoll.roll()
    await formRoll.toMessage()
    const dc = await rollDC(rollable);
    res = [formRoll._total, dc._total];
  } else {
    let skillAcr = Object.keys(skills).find((key) =>
      skills[key].toLowerCase().includes(rollable[0].toLowerCase())
    );
    await actor.rollSkill(skillAcr).then(async (r) => {
      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    });
  }

  if (res.length === 0) {
    throw "Error on rolling ability/tool/skill check/save."

  }

  return res;
}


async function compileDowntimeTab(CRASH_COMPAT, ethckDowntimeTabHtml, sheet) {
  return new Promise((resolve, reject) => {
    if (CRASH_COMPAT === true && game.settings.get("downtime-ethck", "crashCompat")) {
        ethckDowntimeTabHtml = ethckDowntimeTabHtml.find(".inventory-list").unwrap();
        Hooks.on(`CrashTrainingTabReady`, async (app2, html2, data2) => {
            let crash5eTrainingHtml = html2.find(".crash-training");
            crash5eTrainingHtml.find(".ethck-downtime").remove() //Remove Old
            crash5eTrainingHtml.append(ethckDowntimeTabHtml); // Add New
            crash5eTrainingHtml.find(".inventory-list").wrapAll('<ol class="inventory-list"></ol>')
            resolve(crash5eTrainingHtml);
        });
      } else {
        sheet.append(ethckDowntimeTabHtml)
        resolve(sheet);
      }
  });
}

function fixActiveTab(app, CRASH_COMPAT) {
  if (!CRASH_COMPAT) {
    app.activateDowntimeTab = true;
  }
}