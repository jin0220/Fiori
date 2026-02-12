sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter"
], (Controller, JSONModel, Fragment, Filter) => {
    "use strict";

    return Controller.extend("zuimemberb20.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();

            let oViewModel = new JSONModel({});
            this.getView().setModel(oViewModel, "view");
            this._oViewModel = oViewModel;

            this._oModel.read("/MemberSet", {
                success: function (oReturn) {
                    console.log(oReturn.results);
                    this._oViewModel.setProperty("/", oReturn.results);

                }.bind(this),
                error: function (oError) {
                    console.log("초기 조회 에러!");
                }
            });

        },
        onSearch() {

            let oName = this.byId("idName").getValue();
            let oErdat = this.byId("DRS1").getValue();
            let oAedat = this.byId("DRS2").getValue();

            console.log(oErdat.split(' – ')[0]);

            let oFilter1 = new Filter("Name", "Contains", oName);
            let oFilter2 = new Filter("Erdat", "BT", oErdat.split(' – ')[0], oErdat.split(' – ')[0]);
            let oFilter3 = new Filter("Aedat", "BT", oAedat.split(' – ')[0], oAedat.split(' – ')[1]);

            let aFilter = [oFilter1, oFilter2, oFilter3];

            // this._oModel.read("/MemberSet", {
            //     urlParameters: {
            //         "$filter": [oFilter1, oFilter2, oFilter3]
            //     },
            //     success: function (oReturn) {
            //         this._oViewModel.setProperty("/", oReturn.results);
            //     }.bind(this),
            //     error: function () {

            //     }
            // });

            // console.log(oErdat);

            this.byId("idTable").getBinding("items").filter(aFilter);


        },
        onRowSelectionChange() {
            let oDialog = this.getView().byId("idDialog");
            if (oDialog) {
                oDialog.open();
            }
            else {
                Fragment.load();
            }
        },
    });
});