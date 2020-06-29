// our module goes here...

const bootflow = (function () {
  let name = "Bootflow Module";
  let version = "1.0.0";

  let run = ($) => {
    $(document).ready(function () {
      console.log("Name: ", name, "\nVersion: ", version);
    });
  };

  return { run };
})();

export default bootflow;
