#!/usr/bin/env bash

sudo apt-get update
sudo apt-get -y --force-yes install sudo wget curl git unzip supervisor g++ make redis-server

sudo curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential

sudo apt-get install mysql-server -y

sudo npm install
