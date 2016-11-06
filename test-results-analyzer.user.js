// ==UserScript==
// @name        jenkins_test_results_analyzer_redesign
// @namespace   jenkins-ci
// @include     https://*jenkins*.redhat.com/*/test_results_analyzer/
// @version     1.2.2
// @grant       none
// @updateurl   https://raw.githubusercontent.com/rplevka/Greasemonkey---Jenkins-Sat6/master/test-results-analyzer.meta.js
// @downloadurl https://raw.githubusercontent.com/rplevka/Greasemonkey---Jenkins-Sat6/master/test-results-analyzer.user.js
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
    background-color: #d9534f !important;
    color: #fff;
    border-radius: .25em;
  }
  .passed{
    background-color: #5cb85c !important;
    color: #fff;
    border-radius: .25em;
  }
  .skipped{
    background-color: #f0ad4e !important;
    color: #fff;
    border-radius: .25em;
  }
  .no_status{
    background-color: #aaa !important;
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

  .statusWrapper{
    display: table;
    height: 100%;
    width: 100%;
    padding: 0;
    border-collapse: collapse;
   }

  .statusPass{
    display: table-cell;
    height: 100%;
    width: 0.1%;
    background: #5cb85c;
   }

  .statusSkip{
    display: table-cell;
    width: 0.1%;
    background: #eab451;
  }

  .statusFail{
    /*display: table-cell;*/
    background: #d9534f;
    height: 100%;
    width: auto;
   }

  .statusClaim{
    background: #2482b1;
    height: 0%;
   }

  .statusText{
    position: absolute;
    display:  block;
    text-align: center;
    width: 100%;
    top: 50%;
    margin-left:  auto;
    margin-right: auto;
    line-height: 50%;
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
    width: 13px;
    height: 13px;
    content:"";
  }
/* MODAL STYLES */
.modal {
      display: none; /* Hidden by default */
      position: fixed; /* Stay in place */
      z-index: 25; /* Sit on top */
      left: 0;
      top: 0;
      width: 100%; /* Full width */
      height: 100%; /* Full height */
      overflow: auto; /* Enable scroll if needed */
      background-color: rgb(0,0,0); /* Fallback color */
      background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
      -webkit-animation-name: fadeIn; /* Fade in the background */
      -webkit-animation-duration: 0.4s;
      animation-name: fadeIn;
      animation-duration: 0.4s
  }
  .modal_info{
      visibility: hidden;
  }
  .modal_info::after{
    background-image: url("http://www.iconsdb.com/icons/preview/black/info-2-xxl.png");
    background-size: 13px 13px;
    background-repeat: no-repeat;
    background-position: bottom right;
    display: inline-block;
    width: 13px;
    height: 13px;
    content:"";
  }
  /* Modal Content */
  .modal-content {
      position: fixed;
      bottom: 0;
      background-color: #fefefe;
      width: 100%;
      height: 40vh;
      -webkit-animation-name: slideIn;
      -webkit-animation-duration: 0.4s;
      animation-name: slideIn;
      animation-duration: 0.4s;
  }
  /* The Close Button */
  .close {
      color: white;
      float: right;
      font-size: 28px;
      font-weight: bold;
  }
  .close:hover,
  .close:focus {
      color: #000;
      text-decoration: none;
      cursor: pointer;
  }
  .modal-header {
      padding: 2px 16px;
      background-color: #c02942;
      color: white;
  }
  .modal-claim {
      overflow: scroll;
      max-height: 80%;
}
  .modal-body {
      padding: 2px 16px;
      overflow: scroll;
      max-height: 80%;
      background-color: #000;
      color: #fefefe;
      float: left;
      width: 75%;
  }
  .modal-footer {
      padding: 2px 16px;
      background-color: #c02942;
      color: white;
  }
  /* Add Animation */
  @-webkit-keyframes slideIn {
      from {bottom: -300px; opacity: 0}
      to {bottom: 0; opacity: 1}
  }
  @keyframes slideIn {
      from {bottom: -300px; opacity: 0}
      to {bottom: 0; opacity: 1}
  }
  @-webkit-keyframes fadeIn {
      from {opacity: 0}
      to {opacity: 1}
  }
  @keyframes fadeIn {
      from {opacity: 0}
      to {opacity: 1}
  }`;

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
  var rows = document.getElementsByClassName('table-row');
  for(var i of rows){
      if(i.getAttribute('parentclass')!='base'){
          if(i.getAttribute('parentname').startsWith('tests.')){
              i.className += ' child1';
              i.getElementsByClassName('children table-cell')[0].className += ' child1';
              var ch1_fails = i.getElementsByClassName('table-cell build-result failed');
              for(var ch1_fail of ch1_fails){
                decorate_parent_cell(ch1_fail);
              }
          }
          else{
              i.className += ' child2';
              var fails = i.getElementsByClassName('table-cell build-result failed');
              for(var j of fails){
                  j.className += ' test_fail';
                  j.innerHTML += '<div class="icon_container"></div>';
                  cont = j.getElementsByClassName("icon_container")[0];
                  j.onmouseenter = function(el){
                      if(el.target.tagName == "DIV" || el.target.tagName == "SPAN"){
                          el.target.getElementsByClassName("modal_info")[0].style.visibility = "visible";
                      }
                  };
                  j.onmouseleave = function(el){
                      if(el.target.tagName == "DIV" || el.target.tagName == "SPAN"){
                          el.target.getElementsByClassName("modal_info")[0].style.visibility = "hidden";
                      }
                  };
                  var dataResult = JSON.parse(j.getAttribute('data-result'));
                  for(var b of builds){
                      if(b.id == dataResult.buildNumber){
                          for(var c of b.cases){
                              var pclass = j.parentElement.getAttribute('parentclass').replace(/^base-/g, "").replace(/[_-]/g,".");
                              var cclass = c.className.replace(/[_-]/g,".");
                              if(cclass == pclass && c.name == j.parentElement.getAttribute('name')){
                                  if(c.testActions.length > 0){
                                      if(c.testActions[0].claimed === true){
                                          j.className += ' claimed';
                                          var ghUrl = c.testActions[0].reason;
                                          if(ghUrl !== null)
                                             cont.innerHTML +='<a href="'+ghUrl+'" target="_blank"><span class="gh"></span></a>';
                                      }
                                  }
                              }
                          }
                          break;
                      }
                  }
                  // attach the modal button
                  cont.innerHTML +='<span class="modal_info"></span>';
              }
            }
        }
        else{
            i.className += ' child0';
            var ch0_fails = i.getElementsByClassName('table-cell build-result failed');
            for(var ch0_fail of ch0_fails){
                decorate_parent_cell(ch0_fail);
            }
        }
    }
  handleModal();
  console.log('greasemonkey script loaded');
};

function decorate_child_cell(el){}
function decorate_parent_cell(el){
    el.style.position = 'relative';
    el.style.verticalAlign = 'middle';
    el.style.height = '100%';
    el.style.padding = '0';
    var el_a = el.getElementsByTagName('a')[0];
    el_a.parentElement.removeChild(el_a);
    //el append status wrapper etc.
    var wrapper = document.createElement('div');
    var statusPass = document.createElement('div');
    var statusSkip = document.createElement('div');
    var statusFail = document.createElement('div');
    var statusClaim = document.createElement('div');
    var statusText = document.createElement('div');
    var statusTextFail = document.createElement('span');
    var statusTextTotal = document.createElement('span');

    wrapper.className = 'statusWrapper';
    statusPass.className = 'statusPass';
    statusSkip.className = 'statusSkip';
    statusFail.className = 'statusFail';
    statusClaim.className = 'statusClaim';
    statusText.className = 'statusText';
    statusFail.appendChild(statusClaim);
    /*statusText.appendChild(statusTextFail);
               statusText.appendChild(statusTextTotal);*/
    wrapper.appendChild(statusPass);
    wrapper.appendChild(statusSkip);
    wrapper.appendChild(statusFail);
    el.appendChild(wrapper);
    el.appendChild(statusText);
    // load the cell data
    var el_data = JSON.parse(el.getAttribute('data-result'));
    statusPass.style.width = (el_data.totalPassed/el_data.totalTests)*100+0.1 + '%';
    statusSkip.style.width = (el_data.totalSkipped/el_data.totalTests)*100+0.1 + '%';
    statusText.innerHTML = el_data.totalFailed+"/"+el_data.totalTests;
    //console.log(el_data.totalTests);
}

function claimTest(assignee, reason, sticky) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
      if (this.readyState == 4){
          console.log('status: '+this.status);
      }
  };
  xhttp.open("POST", "https://<satellite_url>/<job>/<build>/testReport/<test>/claim/claim", true);
  xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xhttp.send(`json={"assignee":"", "${reason}": "ajax", "sticky":${sticky}}`);

  xhttp.onreadystatechange = function () {
      if (this.readyState == 4){
          console.log('status: '+this.status);
      }};
}

function handleModal() {
  var modal_el = document.createElement('div');
  modal_el.id='testModal';
  modal_el.classList.add('modal');
  modal_el.innerHTML += `
  <div class="modal-content">
    <div class="modal-header">
      <span class="close">&times</span>
      <h2>Modal Header</h2>
    </div>
    <div class="modal-body">
    </div>
    <div class="modal-claim">
<table style="margin-top: 1em; margin-left:0em;">
    <script type="text/javascript">
        function Display(error)
        {
            reasonText = document.getElementById("errordesc");
            obj = {};
            if(error == "Default"){
                reasonText.textContent = "";
            } else{
                reasonText.textContent = obj[error];
            }
            reasonText.readOnly = true;
        }
    </script><tr><td><img src="/static/5dc824d6/plugin/claim/icons/claim-48x48.png" alt="" style="width: 24px; height: 24px; margin-right:1em;" /></td><td style="vertical-align:middle">
                This test was not claimed.
                <div id="claimHoverPopup">
                    <form method="post" id="claimForm" name="claim" action="claim/claim">
                        <table>
                           <tr>
                              <td class="setting-leftspace"></td>
                              <td class="setting-name">Assignee</td>
                              <td class="setting-main">
                                  <script src='/adjuncts/5dc824d6/lib/form/select/select.js' type='text/javascript'></script>
                                  <select fillUrl="/view/Satellite6.2/job/automation-6.2-tier3-rhel6/38/descriptorByName/hudson.plugins.claim.DescribableTestAction/fillAssigneeItems" name="_.assignee" class="setting-input  select " value=""></select>
                              </td>
                            </tr>
                            <tr class="validation-error-area">
                              <td colspan="2"></td><td></td><td></td>
                            </tr>
                            <tr class="help-area">
                              <td></td><td colspan="2">
                                <div class="help">Loading...
                                </div>
                              </td>
                              <td></td>
                            </tr>
                            <tr>
                              <td class="setting-leftspace">
                              </td>
                              <td class="setting-name">Reason</td>
                              <td class="setting-main">
                                <textarea name="reason" id="reason" rows="5" class="setting-input">
                                </textarea><div class="textarea-handle"></div></td>
                             </tr>
                             <tr class="validation-error-area">
                               <td colspan="2"></td><td></td><td></td>
                             </tr>
                             <tr><td class="setting-leftspace"> </td><td class="setting-name">Sticky</td><td class="setting-main"><input name="sticky" checked="true" type="checkbox" class=" " /></td><td class="setting-help"><a helpURL="/plugin/claim/help-sticky.html" href="#" class="help-button"><img src="/static/5dc824d6/images/16x16/help.png" alt="Help for feature: Sticky" style="width: 16px; height: 16px; " class="icon-help icon-sm" /></a></td></tr>
                             <tr class="validation-error-area"><td colspan="2"></td><td></td><td></td></tr>
                             <tr><td colspan="4"><div align="right">
                               <input name="Submit" type="button" value="Claim" class="submit-button primary" onClick="claimTest()"/></div></td>
                             </tr>
                           </table>
                         </form>
                       </div>
                     </td>
                   </tr>
                 </table>
    </div>
  </div>`;

  var tree = document.getElementById('tree');
  tree.appendChild(modal_el);
  // Get the modal
  var modal = document.getElementById('testModal');
  // Get the button that opens the modal
  var btns = document.getElementsByClassName("modal_info");
  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];
  // When the user clicks the button, open the modal
  for (var btn of btns){
      btn.onclick = function(i) {
          //code for handling the test info
          modal.style.display = "block";
          var data = '';
          if (typeof(i.path) !== 'undefined'){
              // for chrome
              data = JSON.parse(i.path[2].dataset.result);
          }
          else{
              //for Firefox
              data = JSON.parse(i.target.parentElement.parentElement.dataset.result);
          }

          //modal.getElementsByClassName('modal-header')[0].innerText = data.name;
          modal.querySelector('.modal-header h2').innerText = data.name + " build: " + data.buildNumber;
          modal.getElementsByClassName('modal-body')[0].innerText = data.failureMessage;
          //data.url to modal.claim
          modal.querySelector('#claimForm').setAttribute('url',data.url+'/claim/claim');
      };
  }
  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  };
  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
  };
}

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
