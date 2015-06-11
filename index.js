var AWS = require('aws-sdk');
var argv = require('minimist')(process.argv.slice(2));

if(! argv.p || ! argv.r){
	console.log("usage: node index.js -p <profile> -r <region>");
	console.log("For example: node index.js -p aws.105 -r eu-west-1");
	process.exit(1);
}

var credentials = new AWS.SharedIniFileCredentials({profile: 'profile ' + argv.p});
AWS.config.credentials = credentials;
AWS.config.update({region: argv.r});

var ec2 = new AWS.EC2();

ec2.describeInstances({}, function(err, data){
  for (var resId = 0; resId < data.Reservations.length; resId++){

    var res = data.Reservations[resId];

    for(var instId=0; instId < res.Instances.length; instId++){
      var instance = res.Instances[instId];
      fixTagsFor(instance);
    }
  }
});

function fixTagsFor(instance){
  var tagsExist = false;
  for(var tagId=0; tagId < instance.Tags.length; tagId++){
    var tag = instance.Tags[tagId];
    if(tag.Key === "Name"){
      var cluster = tag.Value.split('-')[0];
      var site = tag.Value.split('-')[1];
      var role = tag.Value.split('-')[2].match(/^[a-z]+/i)[0];
      var name = tag.Value;
    }
    else if(tag.Key === "Environment" || tag.Key === "Role"){
      tagsExist=true;
    }
  }

  if(!tagsExist) {
    var params = {
      Resources: [
        instance.InstanceId
      ],
      Tags: [
        {
          Key: 'Role',
          Value: role
        },
        {
          Key: 'Environment',
          Value: cluster + "-" + site
        }
      ],
      DryRun: false
    };

    ec2.createTags(params, function(err, data){
      if(err) console.log(err, err.stack);
      else    console.log("tags set for " + instance.InstanceId);
    });
  } else {
    console.log("instance: " + name + " (" + instance.InstanceId + ") already has the Environment and Role tags");
  }
}