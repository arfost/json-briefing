const { prompt, ui } = require('inquirer');
const fs = require('fs');

const configFromFrequencies = async (path, outputFile = "config-" + new Date().getTime()+".json") => {

    // During processing, update the bottom bar content to display a loader
    // or output a progress bar, etc

    let frequencies = require(path);
    let answers = await prompt([{
        type: 'confirm',
        name: 'numeric',
        message: 'Do you wan\'t to remove all numeric node from the results ?'
    }])
    let stopLoader = allLoader("Processing frequencies")
    let intervals = findIntervalsFromFrequencies(frequencies, answers.numeric)

    let message = cffMessInterval(intervals)
    stopLoader();
    let again = true;
    let words = []
    do {
        answers = await prompt([{
            type: 'input',
            name: 'minPercent',
            message: 'Discard values representing less than ? percent',
            validate: answer => {
                return !isNaN(Number(answer)) ? true : "Must be a number between 0 and 100"
            }
        }])
        answers = await prompt([{
            type: 'checkbox',
            name: 'interval',
            message: message,
            choices: cffMessIntervalValues(intervals, answers.minPercent)
        }])

        let selected = cleanIntervals(intervals, answers.interval);

        for (let value of selected) {
            if (Array.isArray(value)) {
                answers = await prompt([{
                    type: 'checkbox',
                    name: 'multi',
                    message: 'Wich of the multi value are goods ?',
                    choices: value
                }])
                words = [...words, ...answers.multi]
            } else {
                words.push(value)
            }
        }
        updateTotals(intervals)
    } while (intervals.intervals.length > 0 && (await prompt([{
        type: 'confirm',
        name: 'continue',
        message: "Values so far : " + words.join(', ') + "\nDo another pass ?"
    }])).continue)
    console.log("All path parts identified, last questions before config file creation")
    let url = await prompt([{
        type: 'input',
        name: 'baseUrl',
        message: "Do you wich to add a default URL to this config. Leave empty for no.",
        validate: url => {
            console.log("verif url : ", url)
            return (url === "" || /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/g.test(url))
        }
    }])

    fs.writeFileSync(outputFile, JSON.stringify({
        pathParts: words,
        baseUrl: url.baseUrl === "" ? undefined : url.baseUrl,
        dataTypes: [
            "string",
            "number",
            "boolean"
        ]
    }, null, 4));
    /*l*/
}

module.exports = { configFromFrequencies }

const updateTotals = (intervals) => {
    let total = 0
    let megaTotal = 0
    for (let interval of intervals.intervals) {
        total += interval.nbValues;
        megaTotal += (interval.frequency * interval.nbValues)
    }
    for (let interval of intervals.intervals) {
        interval.percent = (interval.nbValues / total) * 100
        interval.megaPercent = ((interval.nbValues * interval.frequency) / megaTotal) * 100
    }

    intervals.total = total
    intervals.megaTotal = megaTotal
}

const cleanIntervals = (intervals, values) => {
    let selected = []

    for (let value of values) {
        let index = intervals.intervals.findIndex(f => { return f.value === value });
        let item = intervals.intervals.splice(index, 1)[0];
        selected.push(item.values);
    }
    return selected
}
const findIntervalsFromFrequencies = (frequencies, removeNumeric) => {
    let total = 0;
    let megaTotal = 0;
    let intervals = [];
    for (let frequency in frequencies) {
        let values;
        if (removeNumeric) {
            values = frequencies[frequency].filter(item => {
                return !Number.isInteger(Number(item))
            })
        } else {
            values = frequencies[frequency]
        }
        if (values.length > 0) {
            intervals.push({
                nbValues: values.length,
                frequency: frequency,
                desc: values.length === 1 ? values[0] : "multi (" + values.length + ")",
                value: frequency,
                values: values.length === 1 ? values[0] : values
            })
            total += values.length;
            megaTotal += (frequency * values.length)
        }
    }
    for (let interval of intervals) {
        interval.percent = (interval.nbValues / total) * 100
        interval.megaPercent = ((interval.nbValues * interval.frequency) / megaTotal) * 100
    }
    return {
        intervals: intervals,
        total: total,
        megaTotal: megaTotal
    };
}

const cffMessInterval = (intervals) => {
    let message = "Here are the nb for values found for each frequencies.\n"

    message += "with a total of " + intervals.total + " (" + intervals.megaTotal + ") values"
    message += "Wich frequencies do you wan to choose your values from ?"
    return message;
}

const cffMessIntervalValues = (intervals, minPercent) => {
    return answers => {
        let choices = []
        for (let interval of intervals.intervals) {
            if (interval.megaPercent > minPercent) {
                interval.name = "" + interval.desc + " : " + interval.frequency + " (" + interval.megaPercent + "%)";
                choices.push(interval)
            }
        }
        choices.sort((a, b) => {
            return b.frequency - a.frequency;
        })
        return choices;
    }
}

const cffValidateInterval = answer => {
    let message = "Must be the to frequencies in the list above, first lower than second and separated by a coma"
    if (answer.split(",").length !== 2) {
        return message
    }

    if (!Number.isInteger(Number(answer.split(",")[0])) || !Number.isInteger(Number(answer.split(",")[1]))) {
        return message
    }

    if (!(Number(answer.split(",")[0]) <= Number(answer.split(",")[1]))) {
        return message
    }

    return true;
}

const allLoader = message => {
    var bar = new ui.BottomBar();
    let steps = '|/-\\'
    let step = 0;
    bar.updateBottomBar(message + " " + steps[step]);
    let loader = setInterval(() => {
        step++;
        if (step === steps.length)
            step = 0;

        bar.updateBottomBar(message + " " + steps[step]);
    }, 300)
    return () => {
        clearInterval(loader);
        console.log("\n" + message + " finished");
    }
}