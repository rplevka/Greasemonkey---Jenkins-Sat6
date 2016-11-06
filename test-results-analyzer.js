// ==UserScript==
// @name        jenkins_test_results_analyzer_redesign
// @namespace   wiki.test.redhat.com
// @include     https://*jenkins*.redhat.com/*/test_results_analyzer/
// @version     1.1
// @grant       none
// @updateurl   https://wiki.test.redhat.com/BaseOs/Projects/GreaseMonkey?action=AttachFile&do=view&target=jenkins-test_result_analyzer-redesign.js
// @downloadurl https://wiki.test.redhat.com/BaseOs/Projects/GreaseMonkey?action=AttachFile&do=view&target=jenkins-test_result_analyzer-redesign.js
// @author      roman plevka (rplevka@redhat.com)
// ==/UserScript==

var mainpanel = document.getElementById('main-panel');
var loader = document.getElementById('table-loading');

var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if(mutations[0].attributeName == 'style'){
                    if(obj.getAttribute('style') == 'display: none;')
                        callback();
                }
            });
            obs.observe( obj, { attributes: true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    };
})();


var decorate = function() {
  console.log('greasemonkey script loading...');
  var styles = document.getElementsByTagName('STYLE');

  var style = `

  .failed{
    background-color: #d9534f;
    color: #fff;
    border-radius: .25em;
  }
  .passed{
    background-color: #5cb85c;
    color: #fff;
    border-radius: .25em;
  }
  .skipped{
    background-color: #f0ad4e;
    color: #fff;
    border-radius: .25em;
  }
  .no_status{
    background-color: #aaa;
    color: #fff;
    border-radius: .25em;
  }
  .table{
    border-collapse: separate;
    border-spacing: 2px;
    border: none;
    background-color: #fff !important;
  }
  .table-row{
    border: none;
  }
  .table-cell{
    border: none !important;
  }
  .table-cell a{
    text-decoration: none;
    text-transform: lowercase;
    color: #fff;
  }
  .child0{
    background-color: #eaeaea;
  }
  .child1{
      background-color: #dedede;
  }
  .child2{
      background-color: #d4d4d4;
  }
  .children.child1{
      padding-left: 1.5em;
  }
  .claimed{
      background: repeating-linear-gradient(
        135deg,
        #E5AEA5,
        #E5AEA5 10px,
        #E0AAA0 10px,
        #E0AAA0 20px
      );
      padding-left: 0px;
      padding-right: 3px;
      padding-bottom: 0px;
  }
  .gh::after{
    background-image: url("https://cdn0.iconfinder.com/data/icons/octicons/1024/mark-github-128.png");
    background-size: 13px 13px;
    background-repeat: no-repeat;
    background-position: bottom right;
    display: inline-block;

    width: 100%;
    height: 13px;
    content:"";
  }
`;

  // attach custom CSS styles
  styles[0].innerHTML += style;

  // build-listing API request
  var job_name = document.baseURI.replace(/https?:\/\/[^\/]+[^(job)]+job\/([^\/]+)\/test_results_analyzer\//, "$1");
  var builds = [];
  httpGet(
      // TBD: we might speed up this by finding out the subset of builds to fetch. Current design downloads all builds
      '/job/'+job_name+'/api/json?tree=builds[id,displayName,fullDisplayName,url]',
      function(jobinfo){
          builds = jobinfo.builds;
          // build-fetching API requests (for each build)
          for(var build of builds){
              var url = build.url + 'testReport/api/json?tree=suites[cases[className,name,status,testActions[*]]]';
              httpGet(
                  url.replace(/https?:\/\/[^\/]+/i, ""),
                  // filter-out PASSED and SKIPPED cases as a callback function for the GET request
                  // TBD: we might mitigate this by utilizing jenkins XML api which accepts xpath-like filtering, which happens on the server.
                  function(buildinfo){
                      build.cases = [];
                      for(var c of buildinfo.suites[0].cases){
                          if(c.status != "PASSED" && c.status != "SKIPPED"){
                              build.cases.push(c);
                          }
                      }
                  }
              );
          }
      }
  );
  console.log('decorating rows...');

  var table = document.getElementsByClassName('table')[0];
  var baseRows = table.querySelectorAll('.table-row[parentclass="base"]');
  for (var baseRow of baseRows){
      var child1Rows = table.querySelectorAll('.table-row[parentclass="'+baseRow.className.match(/base-[^ ]*/)[0]+'"]');
      baseRow.addClassName('child0');
      //get fails/totals for the failed builds
      var failedBuilds = baseRow.querySelectorAll('.build-result.failed');
      for(var fb of failedBuilds){
          var failcount = JSON.parse(fb.getAttribute('data-result')).totalFailed;
          var totalcount = JSON.parse(fb.getAttribute('data-result')).totalTests;
          fb.insertAdjacentText('afterBegin', failcount+'/'+totalcount+' ');
      }

      //now for the child1 elements:
      for(var child1Row of child1Rows){
          var child2Rows = table.querySelectorAll('.table-row[parentclass="'+child1Row.className.match(/base-[^ ]*/)[0]+'"]');
          child1Row.addClassName('child1');
          //get fails/totals for the failed builds
          var failedBuilds = child1Row.querySelectorAll('.build-result.failed');
          for(var fb of failedBuilds){
              var failcount = JSON.parse(fb.getAttribute('data-result')).totalFailed;
              var totalcount = JSON.parse(fb.getAttribute('data-result')).totalTests;
              fb.insertAdjacentText('afterBegin', failcount+'/'+totalcount+' ');
          }

          //and for the child2 elements:
          for(var child2Row of child2Rows){
              child2Row.addClassName('child2');
              var fails = child2Row.getElementsByClassName('failed');
              for(var f of fails){
                  f.className += ' test_fail';
                  var dataResult = JSON.parse(f.getAttribute('data-result'));
                  for(var b of builds){
                      if(b.id == dataResult.buildNumber){
                          for(var c of b.cases){
                              var pclass = f.parentElement.getAttribute('parentclass').replace(/^base-/g, "").replace(/[_-]/g,".");
                              var cclass = c.className.replace(/[_-]/g,".");
                              if(cclass == pclass && c.name == f.parentElement.getAttribute('name')){
                                  if(c.testActions.length > 0){
                                      if(c.testActions[0].claimed === true){
                                          f.className += ' claimed';
                                          var ghUrl = c.testActions[0].reason;
                                          if(ghUrl !== null)
                                             f.innerHTML +='<a href="'+ghUrl+'" target="_blank"><div class="gh"></div></a>';
                                      }
                                  }
                              }
                          }
                          break;
                      }
                  }
              }
          }
      }
  }
  console.log('greasemonkey script loaded');
};


function httpGet(url, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsonResponse = JSON.parse(this.responseText);
            callback(jsonResponse);
        }
    };
    url = url.replace(/https?:\/\/[^\/]+/i, "");
    xhttp.open("GET", url, false);
    xhttp.send();
}

// Observe a specific DOM element:
observeDOM(loader ,decorate);
