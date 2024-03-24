/*jshint esversion: 8 */

const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const File = require("@saltcorn/data/models/file");
const View = require("@saltcorn/data/models/view");
const { eval_expression } = require("@saltcorn/data/models/expression");
const { getFileAggregations } = require("@saltcorn/data/models/email");
const Workflow = require("@saltcorn/data/models/workflow");
const FieldRepeat = require("@saltcorn/data/models/fieldrepeat");

const { runInNewContext } = require("vm");

const {
  stateFieldsToWhere,
  readState,
  picked_fields_to_query,
} = require("@saltcorn/data/plugin-helper");

const {
  text,
  div,
  h3,
  style,
  a,
  script,
  pre,
  domReady,
  i,
  input,
} = require("@saltcorn/markup/tags");

const { features, getState } = require("@saltcorn/data/db/state");
const db = require("@saltcorn/data/db");
const public_user_role = features?.public_user_role || 10;

const headers = [
  {
    script: `/plugins/public/filepond@${
      require("./package.json").version
    }/filepond.min.js`,
  },
  {
    css: `/plugins/public/filepond@${
      require("./package.json").version
    }/filepond.min.css`,
  },
];

const get_state_fields = async (table_id, viewname, { columns }) => [
  {
    name: "id",
    type: "Integer",
    required: true,
  },
];

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Views and fields",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });

          const dirs = await File.allDirectories();
          const attachment_opts = [];

          for (const relationPath of await getFileAggregations(table)) {
            attachment_opts.push(relationPath);
          }
          return new Form({
            fields: [
              {
                name: "file_field_path",
                label: "File field",
                sublabel: "Select a relation pointing to a file field",
                input_type: "select",
                options: attachment_opts,
                type: "String",
                default: "",
              },

              {
                name: "field_values_formula",
                label: "Row values formula",
                class: "validate-expression",
                sublabel:
                  "Optional. A formula for field values set when creating a new row. For example <code>{uploader: user.id, uploaded: new Date()}</code>",
                type: "String",
                fieldview: "textarea",
              },
              {
                name: "folder",
                label: "Folder",
                type: "String",
                attributes: { options: dirs.map((d) => d.path_to_serve) },
              },
              {
                name: "credits",
                label: "Credits",
                default: true,
                type: "Bool",
                sublabel: "Include a link to the developers of FilePond",
              },
            ],
          });
        },
      },
    ],
  });

const run = async (
  table_id,
  viewname,
  { file_field_path, field_values_formula, folder, credits },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = table.fields;
  return (
    input({ type: "file", id: `filepond-${viewname}` }) +
    script(
      domReady(`const inputElement = document.getElementById("filepond-${viewname}");
        const pond = FilePond.create(inputElement,{
          ${credits === false ? "credits: false," : ""}
        });`)
    )
  );
};
/*
<input type="file" />

<script>
    // Get a reference to the file input element
    const inputElement = document.querySelector('input[type="file"]');

    // Create a FilePond instance
    const pond = FilePond.create(inputElement);
</script>
*/
const add_row = async (
  table_id,
  viewname,
  { file_field_path, field_values_formula, folder },
  { id, file_name },
  { req }
) => {
  const table = await Table.findOne({ id: table_id });

  const role = req.isAuthenticated() ? req.user.role_id : public_user_role;
  if (
    role > table.min_role_write &&
    !(table.ownership_field || table.ownership_formula)
  ) {
    return { json: { error: "not authorized" } };
  }
  const updRow = {};
  if (topic) updRow[title_field] = topic;
  if (parent_id === "root") updRow[parent_field] = null;
  else if (parent_id) updRow[parent_field] = parent_id;
  await table.updateRow(updRow, id, req.user || { role_id: public_user_role });
  return { json: { success: "ok" } };
};

module.exports = {
  sc_plugin_api_version: 1,
  headers,
  plugin_name: "filepond",
  viewtemplates: [
    {
      name: "FilePond multiple file upload",
      description: "Upload multiple files by a relation",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
      routes: { add_row },
    },
  ],
};
