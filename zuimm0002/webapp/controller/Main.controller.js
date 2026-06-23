sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, Fragment, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("zuimm0002.controller.Main", {
        onInit() {
            this._oModel = this.getOwnerComponent().getModel();

            let oJSONModelMain = new JSONModel({});
            oJSONModelMain.setSizeLimit(500);
            this.getView().setModel(oJSONModelMain, "PRSet");

            let oCntModel = new JSONModel({});
            this.getView().setModel(oCntModel, "StatusCnt")

            this._oModel.read("/PRSet", {
                success: function (oData) {
                    oJSONModelMain.setData(oData.results);

                    oCntModel.setData({
                        before: oData.results.filter(item => item.StatusText === "진행 전").length,
                        ongoing: oData.results.filter(item => item.StatusText === "진행 중").length,
                        complete: oData.results.filter(item => item.StatusText === "진행 완료").length,
                        reject: oData.results.filter(item => item.StatusText === "반려").length
                    });
                },
                error: function (oError) {
                    console.error("OData 읽기 실패: ", oError);
                }
            });

            this._oMetModel = this.getOwnerComponent().getModel("ZMMSH_SRV_B20");

            // 자재번호 서치헬프 데이터 조회
            let oMatHelpModel = new JSONModel({});
            this.getView().setModel(oMatHelpModel, "MaterialHelp");
            
            this._oMetModel.read("/ZCDS_B2_MM_CR_0018", {
                success: function (oData) {
                    oMatHelpModel.setData(oData.results);
                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

            // 플랜트 번호 데이터 조회
            let oWerksHelpModel = new JSONModel({});
            this.getView().setModel(oWerksHelpModel, "WerksHelp");

            this._oMetModel.read("/ZCDS_B2_MM_CR_0019", {
                success: function (oData) {
                    oWerksHelpModel.setData(oData.results);
                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

            // 창고번호 데이터 조회
            let oLgortHelpModel = new JSONModel({});
            this.getView().setModel(oLgortHelpModel, "LgortHelp");

            this._oMetModel.read("/ZCDS_B2_MM_CR_0020", {
                success: function (oData) {
                    oLgortHelpModel.setData(oData.results);
                }.bind(this),
                error: function (oError) {
                    console.error("데이터 조회 실패: ", oError);
                }
            });

        },
        onItemSelect(oEvent) {
            let oListItem = oEvent.getParameter("listItem"); // 클릭한 아이템의 데이터 
            let sPath = oListItem.getBindingContext("PRSet").getPath();
            let oData = this.getView().getModel("PRSet").getProperty(sPath);

            let oRouter = this.getOwnerComponent().getRouter();

            // Parameter 1 : 이동할 대상 routes의 name, manifest.json에서 설정한 값
            // Parameter 2 : 화면 이동 시 전달할 파라미터들 지정, param1은 필수값
            // Parameter 3 : route 히스토리 초기화 여부(생략가능), false는 뒤로가기 가능.
            oRouter.navTo("RouteDetail", {
                banfn: oData.Banfn,
                bnfpo: oData.Bnfpo
            }, false)

        },
        availableState(sStatus) {
            switch (sStatus) {
                case "반려": // 반려
                    return 3; // 빨간색
                case "진행 전": // 진행 전
                    return 4; // 보라색
                case "진행 중": // 진행 중
                    return 1; // 노란색
                case "진행 완료": // 진행 완료
                    return 7; // 초록색
                default:
                    return 10; // 회색
            }
        },
        onPress(oEvent) {
            let sFullId = oEvent.getSource().getId(); // 'application-app-preview-component---Main--idBeforeTile' 이런식으로 출력됨.
            let sLocalId = sFullId.split("--").pop();

            switch (sLocalId) {
                case "idBeforeTile":
                    sLocalId = "진행 전";
                    break;
                case "idOngoingTile":
                    sLocalId = "진행 중";
                    break;
                case "idCompleteTile":
                    sLocalId = "진행 완료";
                    break;
                case "idRejectTile":
                    sLocalId = "반려";
                    break;
                default:
                    break;
            }
            this._oModel.read("/PRSet", {
                filters: [
                    new Filter("StatusText", FilterOperator.EQ, sLocalId)
                ],
                success: function (oData) {
                    console.log(oData);
                    this.getView().getModel("PRSet").setData(oData.results);
                }.bind(this),
                error: function (oError) {
                    console.error("OData 읽기 실패: ", oError);
                }
            });
        },
        //========================================================================================
        // 서치헬프
        //========================================================================================
        onValueHelpRequest: function (oEvent) {
            var oView = this.getView();
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId();

            if (this._oValueHelpDialog) {
                this._oValueHelpDialog.data("targetInput", oInput);
                this._configValueHelpDialog(this._oValueHelpDialog, sInputId);
                this._oValueHelpDialog.open();
                return;
            }

            // 처음 팝업 로드
            sap.ui.core.Fragment.load({
                name: "zuimm0002.view.fragments.ValueHelpDialog",
                controller: this
            }).then(function (oDialog) {
                this._oValueHelpDialog = oDialog;
                oView.addDependent(this._oValueHelpDialog);

                this._oValueHelpDialog.data("targetInput", oInput);
                this._configValueHelpDialog(this._oValueHelpDialog, sInputId);
                this._oValueHelpDialog.open();
                
            }.bind(this));
        },
        _configValueHelpDialog: function (oDialog, sInputId) {
            if (sInputId.includes("idMatnr")) {
                oDialog.setTitle("자재코드 선택");
                oDialog.setNoDataText("조회된 자재가 없습니다.");

                oDialog.bindAggregation("items", {
                    path: "MaterialHelp>/",
                    template: new sap.m.StandardListItem({
                        title: "{MaterialHelp>Matnr}",
                        description: "{MaterialHelp>Maktx}",
                        type: "Active"
                    })
                });

            } else if (sInputId.includes("idWerks")) {
                oDialog.setTitle("플랜트 선택");
                oDialog.setNoDataText("조회된 플랜트가 없습니다.");

                oDialog.bindAggregation("items", {
                    path: "WerksHelp>/",
                    template: new sap.m.StandardListItem({
                        title: "{WerksHelp>Werks}",
                        description: "{WerksHelp>Name1}",
                        type: "Active"
                    })
                });

            } else if (sInputId.includes("idLgort")) {

                oDialog.setTitle("창고 선택");
                oDialog.setNoDataText("조회된 창고가 없습니다.");

                var sWerksValue = this.byId("idWerks").getValue();
                var aFilters = [];
                if (sWerksValue) {
                    aFilters.push(new Filter("Werks", FilterOperator.EQ, sWerksValue));
                }

                oDialog.bindAggregation("items", {
                    path: "LgortHelp>/",
                    template: new sap.m.StandardListItem({
                        title: "{LgortHelp>Lgort}",
                        description: "{LgortHelp>Adrnr}",
                        info: "{= '플랜트: ' + ${LgortHelp>Werks} }",
                        type: "Active"
                    })
                });
            }
        },
        onConfirmCommonPopup: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            var oDialog = oEvent.getSource();
            var oTargetInput = oDialog.data("targetInput");

            if (!oSelectedItem) {
                return; // 선택 안 하고 닫으면 그냥 종료
            }

            var sTargetInputId = oTargetInput.getId();

            if (sTargetInputId.includes("idMatnr")) {
                let sSelectedMatnr = oSelectedItem.getBindingContext("MaterialHelp").getProperty("Matnr");
                oTargetInput.setValue(sSelectedMatnr);

            } else if (sTargetInputId.includes("idWerks")) {
                let sSelectedWerks = oSelectedItem.getBindingContext("WerksHelp").getProperty("Werks");
                oTargetInput.setValue(sSelectedWerks);

            } else if (sTargetInputId.includes("idLgort")) {
                let sSelectedLgort = oSelectedItem.getBindingContext("LgortHelp").getProperty("Lgort");
                let sSelectedWerks = oSelectedItem.getBindingContext("LgortHelp").getProperty("Werks");

                oTargetInput.setValue(sSelectedLgort);
                this.byId("idWerks").setValue(sSelectedWerks);
            }

        },
        onSearchValueHelp: function (oEvent) {
            var sValue = oEvent.getParameter("value");

            var oBinding = oEvent.getSource().getBinding("items");
            if (!oBinding) { return; }

            var oTargetInput = oEvent.getSource().data("targetInput");
            var sTargetInputId = oTargetInput ? oTargetInput.getId() : "";

            var aFilters = [];

            // 검색어가 있을 때만 필터 배열 구성
            if (sValue) {
                if (sTargetInputId.includes("idMatnr")) {
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("Matnr", FilterOperator.Contains, sValue),
                            new Filter("Maktx", FilterOperator.Contains, sValue)
                        ],
                        and: false // OR 조건
                    }));
                } else if (sTargetInputId.includes("idWerks")) {
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("Werks", FilterOperator.Contains, sValue),
                            new Filter("Name1", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    }));
                } else if (sTargetInputId.includes("idLgort")) {
                    aFilters.push(new Filter({
                        filters: [
                            new Filter("Lgort", FilterOperator.Contains, sValue),
                            new Filter("Adrnr", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    }));
                }
            }

            oBinding.filter(aFilters);
        },
        // =======================================================
        // 제안 기능 (Input 타이핑 시 자동완성 필터링)
        // =======================================================
        onSuggestMatnr: function (oEvent) {
            var sValue = oEvent.getParameter("suggestValue");
            var oInput = oEvent.getSource();
            var aFilters = [];

            if (sValue) {
                aFilters = [
                    new Filter({
                        filters: [
                            new Filter("Matnr", FilterOperator.Contains, sValue),
                            new Filter("Maktx", FilterOperator.Contains, sValue)
                        ],
                        and: false // 자재코드 또는 자재명 둘 중 하나라도 포함되면 제안 리스트에 표시
                    })
                ];
            }

            // Input의 suggestionItems 바인딩 객체를 가져와서 필터 적용
            var oBinding = oInput.getBinding("suggestionItems");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
            console.log(oInput);
            console.log(oBinding);
        }
        //=============================================================================
        // 검색 로직
        //=============================================================================
    });
});