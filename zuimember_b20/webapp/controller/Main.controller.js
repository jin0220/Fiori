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

            this.onReadData();

            this._saveFlag = "";

        },
        onReadData() {
            this._oModel.read("/MemberSet", {
                success: function (oReturn) {
                    console.log(oReturn.results);
                    oReturn.results.map((item) => {
                        if(item.Aenam == '') {
                            item.Aezet = null;
                        }
                    });
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

            let aFilter = [];

            let oFilter1 = new Filter("Name", "Contains", oName);
            let oFilter2 = new Filter("Erdat", "BT", new Date(oErdat.split(' – ')[0]), new Date(oErdat.split(' – ')[1]));
            let oFilter3 = new Filter("Aedat", "BT", new Date(oAedat.split(' – ')[0]), new Date(oAedat.split(' – ')[1]));

            if(oName !== '') {
                aFilter.push(oFilter1);
            }

            if(oErdat !== '') {
                aFilter.push(oFilter2);
            }

            if(oAedat !== '') {
                aFilter.push(oFilter3);
            }

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

            this.byId("idTable").getBinding().filter(aFilter);


        },
        onRowSelectionChange(oEvent) {
            let oContext = oEvent.getParameters().rowContext;

            // 데이터 삭제시 해당 함수가 다시 실행이 되는데 이때 선택한 row가 없으면 함수 종료하게 구현
            if (!oContext) {
                return;
            }

            let sPath = oContext.getPath();

            let oData = this._oViewModel.getProperty(sPath);
            console.log(oData);
            // debugger;
            let oDialog = sap.ui.getCore().byId("idDialog");
            
            if (oDialog) {
                oDialog.open();
                oDialog.setModel(new JSONModel(oData), "Detail");
                sap.ui.getCore().byId("idSelect").setVisible(true);
            }
            else {
                Fragment.load({
                    name: "zuimemberb20.view.fragment.Dialog",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function(oDialog){ // 로드한 후의 반환값이 인자로 들어옴.
                    oDialog.open();
                    oDialog.setModel(new JSONModel(oData), "Detail");
                });
            }
            this._saveFlag = "modify";
            
        },
        onClose: function() {
            sap.ui.getCore().byId("idDialog").close();
        },
        onCreate() {
            this._saveFlag = "create";
            let oDialog = sap.ui.getCore().byId("idDialog");
            
            if (oDialog) {
                oDialog.open();
                oDialog.setModel(new JSONModel({}), "Detail");
                sap.ui.getCore().byId("idSelect").setVisible(false);
            }
            else {
                Fragment.load({
                    name: "zuimemberb20.view.fragment.Dialog",
                    type: "XML",
                    controller: this // 로드하는 fragment에서 사용할 수 있도록 현재 controller 넘겨줌
                }).then(function(oDialog){ // 로드한 후의 반환값이 인자로 들어옴.
                    oDialog.open();
                    oDialog.setModel(new JSONModel({}), "Detail");
                    sap.ui.getCore().byId("idSelect").setVisible(false);
                }.bind(this));
            }

        },
        onSave() {
            
            if(this._saveFlag == "create") {
                let oData = sap.ui.getCore().byId("idDialog").getModel("Detail").getData();

                this._oModel.create("/MemberSet", oData, {
                    success: function(oReturn){
                        let oModel = this._oViewModel.getData();
                        oReturn.Aezet = null;
                        oModel.push(oReturn);
                        this._oViewModel.setData(oModel);
                        console.log("데이터 저장 완료", oReturn);
                    }.bind(this),
                    error : function () {
                        console.log("데이터 저장 실패");
                    }
                });
            }
            else if (this._saveFlag == "modify") {
                let mode = sap.ui.getCore().byId("idSelect").getSelectedKey();
                console.log(mode);

                let oData = sap.ui.getCore().byId("idDialog").getModel("Detail").getData();
                
                let sPath = this._oModel.createKey("/MemberSet", {
                    Id: oData.Id
                });
                if(mode == "update") {
                    this._oModel.update(sPath, oData, {
                        success: function(oReturn){
                            this._oViewModel.refresh();
                            console.log("데이터 수정 완료", oReturn);
                        }.bind(this),
                        error : function () {
                            console.log("데이터 수정 실패");
                        }
                    });
                }
                else if(mode == "delete") {
                    this._oModel.remove(sPath, {
                        success: function(oReturn){
                            // let tmpData = this._oViewModel.getProperty("/");
                            // let idx = tmpData.findIndex((tmp)=> tmp.Id === oData.Id);
                            // if(idx !== -1){
                            //     tmpData.splice(idx, 1);
                            //      this._oViewModel.setData(tmpData);
                            // }
                            this.onReadData();
                            console.log("데이터 삭제 완료");
                            
                        }.bind(this),
                        error : function () {
                            console.log("데이터 삭제 실패");
                        }
                    });
                }
            }
            
            sap.ui.getCore().byId("idDialog").close();
            // this.onInit();
        }
    });
});