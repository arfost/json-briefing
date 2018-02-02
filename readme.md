# json-briefing

[![NPM](https://nodei.co/npm/json-briefing.png?downloads=true&downloadRank=true)](https://nodei.co/npm/json-briefing/)

## Motivation

`json-briefing` is a little CLI tool to generate report from JSON file or url. 
For now it is really simple, but it will expand little by little, as will this readme.

## Usage

To use `json-briefing` first install it. It's a CLI tool, so it's intended to be installed globally

```
npm install -g json-briefing
```

After that, simply invoque it with command.

```
json-briefing
```

```
json-briefing --help
```
will show help infos and how to use it.


The commande 
```
json-briefing create_config
```
Will help you generate a config file to use in analyse after that.

The commande 
```
json-briefing f_analyse
```
will generate a frequency analysis file to use with create_config use it if you are not sur or the name of the nodes in your file.

The commande 
```
json-briefing analyse
```
will launch an analyse and generate a rapport.

/!\ It's in early developpement so no public doc, probable bugs, and incomplet features.

Next planning updates : 
Better doc, more complete config file generation, partial report for lighter and easier to compare result file and more